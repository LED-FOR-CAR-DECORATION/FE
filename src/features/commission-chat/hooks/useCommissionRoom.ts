"use client";

import "@/lib/api/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api_client/core/ApiError";
import { getCustomerCommission } from "@/features/commission/services/customer-commission.api";
import { getApiErrorMessage } from "@/lib/api/auth";
import { getManagementCommission } from "@/features/commission/services/management-commission.api";
import {
  CHAT_ACTIVE_STATUSES,
  canReadHistory,
  mergeMessages,
  sendCommissionMessage,
  uploadCommissionChatImage,
  type CommissionMessage,
} from "../services/commission-messages.api";
import { reconnectNow, subscribeHubStatus, subscribeTopic, type StompStatus } from "../services/stomp-hub";
import { appendMessagesToCache, fetchMessagesCached } from "../services/messages-cache";
import { useQueryClient } from "@tanstack/react-query";
import { isPageVisible, scheduleVisiblePoll } from "@/lib/polling";

export type ChatViewer = "CUSTOMER" | "STAFF";

/** Thông tin commission hiển thị trong phòng chat, chuẩn hóa từ API customer hoặc management. */
export interface CommissionRoomInfo {
  commissionId: number;
  title: string;
  status: string;
  description?: string | null;
  tierCode?: string | null;
  targetMatrixDimensions?: string | null;
  totalPrice?: number;
  initialPrice?: number;
  extraRevisionFee?: number;
  revisionsUsed?: number;
  maxRevisions?: number;
  slaDueAt?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  assignedStaffName?: string | null;
  assignedDesignerName?: string | null;
  attachments: { id: number; imageUrl: string; caption?: string | null }[];
  deliveredPreviews: { id: number; versionNumber: number; imageUrl: string; designerNote?: string | null; designerName?: string | null; status: string }[];
}

/** Tin đang gửi (chưa có messageId từ server). */
export interface PendingMessage {
  tempId: string;
  messageType: "TEXT" | "IMAGE";
  content: string;
  file?: File;
  previewUrl?: string;
  failed?: string;
}

const STATUS_POLL_MS = 4000;
const FALLBACK_POLL_MS = 15000;
/**
 * BE chưa bật heart-beat STOMP nên socket chết lặng (đổi Wi-Fi, proxy cắt kết nối rảnh, máy ngủ) vẫn báo "connected".
 * Trong lúc đó cứ mỗi khoảng này đối chiếu lịch sử bằng REST; thấy tin cũ hơn VERIFY_GRACE_MS mà socket không nhận được
 * thì kết nối lại. Bỏ khi BE có heart-beat (docs/api-fetch-optimization.md, mục 0a).
 */
const VERIFY_CONNECTED_MS = 60_000;
const VERIFY_GRACE_MS = 5_000;

async function fetchInfo(commissionId: number, viewer: ChatViewer): Promise<CommissionRoomInfo> {
  if (viewer === "CUSTOMER") {
    const { data } = await getCustomerCommission(commissionId);
    if (!data) throw new Error("Không tìm thấy Commission.");
    return {
      commissionId: data.commissionId,
      title: data.title,
      status: data.status,
      description: data.description,
      tierCode: data.tierCode,
      targetMatrixDimensions: data.targetMatrixDimensions,
      totalPrice: data.totalPrice,
      initialPrice: data.initialPrice,
      extraRevisionFee: data.extraRevisionFee,
      revisionsUsed: data.revisionsUsed,
      maxRevisions: data.maxRevisions,
      slaDueAt: data.estimatedDeliveryAt,
      createdAt: data.createdAt,
      attachments: (data.attachments ?? []).map((item) => ({ id: item.attachmentId, imageUrl: item.imageUrl, caption: item.caption })),
      deliveredPreviews: (data.deliveredPreviews ?? []).map((item) => ({
        id: item.submissionId, versionNumber: item.versionNumber, imageUrl: item.imageUrl,
        designerNote: item.designerNote, status: item.status,
      })),
    };
  }
  const { data } = await getManagementCommission(commissionId);
  return {
    commissionId: data.commissionId,
    title: data.title,
    status: data.status,
    description: data.description,
    tierCode: data.tierCode,
    targetMatrixDimensions: data.targetMatrixDimensions,
    totalPrice: data.totalPrice,
    initialPrice: data.initialPrice,
    extraRevisionFee: data.extraRevisionFee,
    revisionsUsed: data.revisionsUsed,
    maxRevisions: data.maxRevisions,
    slaDueAt: data.slaDueAt,
    createdAt: data.createdAt,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    assignedStaffName: data.assignedStaffName,
    assignedDesignerName: data.assignedDesignerName,
    attachments: (data.attachments ?? []).map((item) => ({ id: item.attachmentId, imageUrl: item.imageUrl, caption: item.caption })),
    // Staff thấy mọi bản nộp của designer (kèm trạng thái duyệt), không chỉ bản đã giao cho khách.
    deliveredPreviews: (data.submissions ?? []).map((item) => ({
      id: item.submissionId, versionNumber: item.versionNumber, imageUrl: item.imageUrl,
      designerNote: item.designerNote, designerName: item.designerName, status: item.status,
    })),
  };
}

function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? (error.body as { code?: string } | undefined)?.code : undefined;
}

export function useCommissionRoom(commissionId: number, viewer: ChatViewer) {
  const queryClient = useQueryClient();
  const [info, setInfo] = useState<CommissionRoomInfo>();
  const [infoError, setInfoError] = useState("");
  const [messages, setMessages] = useState<CommissionMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [hubStatus, setHubStatus] = useState<StompStatus>("disconnected");
  /** Server từ chối quyền vào phòng này → không có realtime, dùng poll dự phòng. */
  const [denied, setDenied] = useState(false);
  const realtime: StompStatus = denied ? "disconnected" : hubStatus;
  const [reloadKey, setReloadKey] = useState(0);
  /** messageId của tin đến realtime qua STOMP (để FE chạy hiệu ứng xuất hiện). Lịch sử tải từ REST không nằm trong set này. */
  const [liveIds, setLiveIds] = useState<ReadonlySet<number>>(() => new Set());
  const knownIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    knownIds.current = new Set(messages.map((message) => message.messageId));
  }, [messages]);

  const status = info?.status;
  const readable = canReadHistory(status);
  const canSend = Boolean(status && CHAT_ACTIVE_STATUSES.has(status));

  // ---- Thông tin commission. Sau thanh toán, webhook có thể cập nhật trạng thái chậm vài giây → poll đến khi phòng chat mở.
  const loadInfo = useCallback(async () => {
    try {
      const next = await fetchInfo(commissionId, viewer);
      setInfo(next);
      setInfoError("");
      return next;
    } catch (error) {
      setInfoError(getApiErrorMessage(error, "Không tải được thông tin Commission."));
      return undefined;
    }
  }, [commissionId, viewer]);

  useEffect(() => {
    let active = true;
    let cancelPoll: (() => void) | undefined;
    async function run() {
      const next = await loadInfo();
      if (!active) return;
      const waitingForChat = next && (next.status === "PENDING_PAYMENT" || next.status === "PENDING_REVIEW");
      if (waitingForChat) cancelPoll = scheduleVisiblePoll(() => void run(), STATUS_POLL_MS);
    }
    void run();
    return () => {
      active = false;
      cancelPoll?.();
    };
  }, [loadInfo, reloadKey]);

  // ---- Lịch sử tin nhắn
  /** Trả về số tin đã đủ cũ (quá VERIFY_GRACE_MS) mà trước đó FE chưa biết — dùng để phát hiện socket chết lặng. */
  const loadHistory = useCallback(async ({ force = false }: { force?: boolean } = {}): Promise<number> => {
    try {
      const list = await fetchMessagesCached(queryClient, commissionId, { force });
      const graceLimit = Date.now() - VERIFY_GRACE_MS;
      const missed = knownIds.current.size === 0 ? 0 : list.filter(
        (m) => !knownIds.current.has(m.messageId) && new Date(m.createdAt).getTime() < graceLimit,
      ).length;
      // Lần tải đầu (chưa biết tin nào) thì effect thông tin đã tải rồi, không coi mọi thẻ là "mới".
      const hasNewStateCard = knownIds.current.size > 0 && list.some(
        (m) =>
          !knownIds.current.has(m.messageId) &&
          m.messageType !== "TEXT" &&
          m.messageType !== "IMAGE",
      );
      setMessages((current) => mergeMessages(current, list));
      setHistoryError("");
      if (hasNewStateCard) {
        void loadInfo();
      }
      return missed;
    } catch (error) {
      if (errorCode(error) === "INVALID_COMMISSION_STATUS_TRANSITION") {
        setHistoryError("Phòng chat chưa được mở cho trạng thái hiện tại.");
      } else {
        setHistoryError(getApiErrorMessage(error, "Không tải được lịch sử tin nhắn."));
      }
    } finally {
      setHistoryLoaded(true);
    }
    return 0;
  }, [commissionId, loadInfo, queryClient]);
  const refreshHistory = useCallback(() => loadHistory({ force: true }), [loadHistory]);

  useEffect(() => {
    // Nút "Tải lại" (reloadKey > 0) bỏ qua cache; lần mở phòng đầu dùng lịch sử hộp thư vừa tải nếu còn mới.
    if (readable) void loadHistory({ force: reloadKey > 0 });
  }, [readable, loadHistory, reloadKey]);

  // Tin hệ thống / thẻ deliverable / thẻ phụ phí thường đi kèm đổi trạng thái → tải lại thông tin (gộp nhiều tin liên tiếp).
  const infoRefreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scheduleInfoRefresh = useCallback(() => {
    clearTimeout(infoRefreshTimer.current);
    infoRefreshTimer.current = setTimeout(() => void loadInfo(), 120);
  }, [loadInfo]);
  useEffect(() => () => clearTimeout(infoRefreshTimer.current), []);

  // ---- Realtime STOMP /topic/commissions/{id} qua kết nối dùng chung của cả tab (stomp-hub).
  useEffect(() => subscribeHubStatus(setHubStatus), []);

  useEffect(() => {
    if (!readable) return;
    setDenied(false);
    const unsubscribe = subscribeTopic(`/topic/commissions/${commissionId}`, {
      onActive: (isReconnect) => {
        // Lần đầu: lịch sử & thông tin vừa được tải bằng REST ở các effect trên → không tải lại.
        if (!isReconnect) return;
        void loadHistory({ force: true }); // bù các tin bị lỡ trong lúc mất kết nối
        void loadInfo();
      },
      onDenied: () => setDenied(true),
      onMessage: (body) => {
        try {
          const message = JSON.parse(body) as CommissionMessage; // STOMP gửi raw CommissionMessageResponse, không có ApiResponse envelope
          if (typeof message?.messageId !== "number") return;
          if (!knownIds.current.has(message.messageId)) {
            knownIds.current.add(message.messageId);
            setLiveIds((current) => new Set(current).add(message.messageId));
          }
          setMessages((current) => mergeMessages(current, [message]));
          appendMessagesToCache(queryClient, commissionId, [message]);
          if (message.messageType !== "TEXT" && message.messageType !== "IMAGE") scheduleInfoRefresh();
        } catch {
          // bỏ qua frame không hợp lệ
        }
      },
    });
    return unsubscribe;
  }, [readable, commissionId, loadHistory, loadInfo, scheduleInfoRefresh, queryClient]);

  // Dự phòng khi WebSocket không kết nối được: poll lịch sử & trạng thái commission định kỳ.
  useEffect(() => {
    if (!readable || realtime === "connected") return;
    const timer = setInterval(() => {
      if (isPageVisible()) {
        void loadHistory({ force: true });
        void loadInfo();
      }
    }, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [readable, realtime, loadHistory, loadInfo]);

  // Đang "connected": thỉnh thoảng đối chiếu bằng REST để bắt kết nối chết lặng (xem VERIFY_CONNECTED_MS).
  useEffect(() => {
    if (!readable || realtime !== "connected") return;
    const timer = setInterval(async () => {
      if (!isPageVisible()) return;
      const missed = await loadHistory({ force: true });
      if (missed > 0) reconnectNow();
    }, VERIFY_CONNECTED_MS);
    return () => clearInterval(timer);
  }, [readable, realtime, loadHistory]);

  // ---- Gửi tin
  const deliver = useCallback(async (item: PendingMessage) => {
    setPending((current) => current.map((p) => (p.tempId === item.tempId ? { ...p, failed: undefined } : p)));
    try {
      let mediaUrl: string | null = null;
      if (item.messageType === "IMAGE") {
        if (!item.file) throw new Error("Thiếu ảnh.");
        mediaUrl = await uploadCommissionChatImage(commissionId, item.file);
      }
      const { data } = await sendCommissionMessage(commissionId, {
        messageType: item.messageType,
        content: item.content,
        mediaUrl,
      });
      knownIds.current.add(data.messageId); // tin của chính mình: bong bóng "đang gửi" đã hiển thị, không chạy lại hiệu ứng
      setMessages((current) => mergeMessages(current, [data]));
      appendMessagesToCache(queryClient, commissionId, [data]);
      setPending((current) => current.filter((p) => p.tempId !== item.tempId));
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    } catch (error) {
      const code = errorCode(error);
      if (code === "INVALID_COMMISSION_STATUS_TRANSITION") void loadInfo();
      const message = code === "COMMISSION_STAFF_LOCKED"
        ? "Commission này đã có nhân viên khác phụ trách."
        : code === "INVALID_COMMISSION_STATUS_TRANSITION"
          ? "Phòng chat không còn hoạt động ở trạng thái hiện tại."
          : getApiErrorMessage(error, "Gửi tin nhắn thất bại.");
      setPending((current) => current.map((p) => (p.tempId === item.tempId ? { ...p, failed: message } : p)));
    }
  }, [commissionId, loadInfo, queryClient]);

  const send = useCallback((content: string, file?: File) => {
    const item: PendingMessage = {
      tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      messageType: file ? "IMAGE" : "TEXT",
      content: content.trim(),
      file,
      previewUrl: file ? URL.createObjectURL(file) : undefined,
    };
    setPending((current) => [...current, item]);
    void deliver(item);
  }, [deliver]);

  const retry = useCallback((tempId: string) => {
    const item = pending.find((p) => p.tempId === tempId);
    if (item) void deliver(item);
  }, [pending, deliver]);

  const discard = useCallback((tempId: string) => {
    setPending((current) => {
      const item = current.find((p) => p.tempId === tempId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((p) => p.tempId !== tempId);
    });
  }, []);

  /** Gộp tin do một thao tác trả về (thẻ, tin hệ thống) — STOMP cũng sẽ gửi lại, mergeMessages tự khử trùng lặp. */
  const addMessages = useCallback((incoming: CommissionMessage[]) => {
    for (const message of incoming) knownIds.current.add(message.messageId);
    setMessages((current) => mergeMessages(current, incoming));
    appendMessagesToCache(queryClient, commissionId, incoming);
  }, [queryClient, commissionId]);

  const reload = useCallback(() => {
    setInfoError("");
    setHistoryError("");
    setReloadKey((value) => value + 1);
  }, []);

  return {
    info, infoError, messages, liveIds, historyLoaded, historyError, pending, realtime,
    readable, canSend, send, retry, discard, reload, refreshInfo: loadInfo, refreshHistory, addMessages,
  };
}
