"use client";

import "@/lib/api/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api_client/core/ApiError";
import { getCustomerCommission } from "@/features/commission/services/customer-commission.api";
import { getApiBaseUrl, refreshAccessToken } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/auth";
import { getSessionToken } from "@/lib/auth/session";
import { getManagementCommission } from "@/features/commission/services/management-commission.api";
import {
  CHAT_ACTIVE_STATUSES,
  canReadHistory,
  listCommissionMessages,
  mergeMessages,
  sendCommissionMessage,
  uploadCommissionChatImage,
  type CommissionMessage,
} from "../services/commission-messages.api";
import { buildStompUrl, subscribeStomp, type StompStatus } from "../services/stomp-client";

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
const MAX_STOMP_ERRORS = 3;

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
  const [info, setInfo] = useState<CommissionRoomInfo>();
  const [infoError, setInfoError] = useState("");
  const [messages, setMessages] = useState<CommissionMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [realtime, setRealtime] = useState<StompStatus>("disconnected");
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
    let timer: ReturnType<typeof setTimeout>;
    async function run() {
      const next = await loadInfo();
      if (!active) return;
      const waitingForChat = next && (next.status === "PENDING_PAYMENT" || next.status === "PENDING_REVIEW");
      if (waitingForChat) timer = setTimeout(run, STATUS_POLL_MS);
    }
    void run();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadInfo, reloadKey]);

  // ---- Lịch sử tin nhắn
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await listCommissionMessages(commissionId);
      setMessages((current) => mergeMessages(current, data ?? []));
      setHistoryError("");
    } catch (error) {
      if (errorCode(error) === "INVALID_COMMISSION_STATUS_TRANSITION") {
        setHistoryError("Phòng chat chưa được mở cho trạng thái hiện tại.");
      } else {
        setHistoryError(getApiErrorMessage(error, "Không tải được lịch sử tin nhắn."));
      }
    } finally {
      setHistoryLoaded(true);
    }
  }, [commissionId]);

  useEffect(() => {
    if (readable) void loadHistory();
  }, [readable, loadHistory, reloadKey]);

  // Tin hệ thống / thẻ deliverable / thẻ phụ phí thường đi kèm đổi trạng thái → tải lại thông tin (gộp nhiều tin liên tiếp).
  const infoRefreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scheduleInfoRefresh = useCallback(() => {
    clearTimeout(infoRefreshTimer.current);
    infoRefreshTimer.current = setTimeout(() => void loadInfo(), 600);
  }, [loadInfo]);
  useEffect(() => () => clearTimeout(infoRefreshTimer.current), []);

  // ---- Realtime STOMP /topic/commissions/{id}
  useEffect(() => {
    if (!readable) return;
    let url: string;
    try {
      url = buildStompUrl(getApiBaseUrl());
    } catch {
      return;
    }
    let errors = 0;
    const unsubscribe = subscribeStomp({
      url,
      destination: `/topic/commissions/${commissionId}`,
      getToken: getSessionToken,
      onStatusChange: setRealtime,
      onConnected: () => {
        errors = 0;
        void loadHistory(); // bù các tin bị lỡ trong lúc mất kết nối
      },
      onError: async () => {
        errors += 1;
        if (errors >= MAX_STOMP_ERRORS) return false;
        try {
          return Boolean(await refreshAccessToken());
        } catch {
          // Keep the existing bounded reconnect policy for temporary refresh outages.
          return true;
        }
      },
      onMessage: (body) => {
        try {
          const message = JSON.parse(body) as CommissionMessage; // STOMP gửi raw CommissionMessageResponse, không có ApiResponse envelope
          if (typeof message?.messageId !== "number") return;
          if (!knownIds.current.has(message.messageId)) {
            knownIds.current.add(message.messageId);
            setLiveIds((current) => new Set(current).add(message.messageId));
          }
          setMessages((current) => mergeMessages(current, [message]));
          if (message.messageType !== "TEXT" && message.messageType !== "IMAGE") scheduleInfoRefresh();
        } catch {
          // bỏ qua frame không hợp lệ
        }
      },
    });
    return unsubscribe;
  }, [readable, commissionId, loadHistory, scheduleInfoRefresh]);

  // Dự phòng khi WebSocket không kết nối được: poll lịch sử định kỳ.
  useEffect(() => {
    if (!readable || realtime === "connected") return;
    const timer = setInterval(() => void loadHistory(), FALLBACK_POLL_MS);
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
  }, [commissionId, loadInfo]);

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
  }, []);

  const reload = useCallback(() => {
    setInfoError("");
    setHistoryError("");
    setReloadKey((value) => value + 1);
  }, []);

  return {
    info, infoError, messages, liveIds, historyLoaded, historyError, pending, realtime,
    readable, canSend, send, retry, discard, reload, refreshInfo: loadInfo, addMessages,
  };
}
