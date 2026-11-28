"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ImagePlus, Loader2, RotateCcw, Send, Trash2, X } from "lucide-react";
import "@/styles/transitions.css";
import { formatPrice } from "@/lib/currency";
import StaffDraftReview from "@/features/commission/components/StaffDraftReview";
import StaffRevisionCard from "@/features/commission/components/StaffRevisionCard";
import { DeliverableCard, RevisionCard, type CardContext } from "./CommissionCards";
import CommissionAvatar from "./CommissionAvatar";
import { commissionStatusLabel, formatCommissionSystemMessage } from "../commission-status";
import { useCommissionRoom, type ChatViewer, type CommissionRoomInfo, type PendingMessage } from "../hooks/useCommissionRoom";
import { MAX_MESSAGE_LENGTH, parseMetadata, type CommissionMessage } from "../services/commission-messages.api";

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING_STAFF_REVIEW: "Chờ staff duyệt",
  STAFF_REJECTED: "Staff từ chối",
  STAFF_APPROVED: "Đã duyệt",
  CUSTOMER_ACCEPTED: "Khách chấp nhận",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const isHttpUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);

function formatTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function CommissionChatRoom({ commissionId, viewer, variant = "page", onBack, onLastMessage }: {
  commissionId: number;
  viewer: ChatViewer;
  /** "messenger": lấp đầy khung chứa (hộp thư của staff), cột thông tin cuộn riêng. */
  variant?: "page" | "messenger";
  /** Nút quay lại danh sách hội thoại (mobile, chế độ messenger). */
  onBack?: () => void;
  /** Báo tin cuối cùng cho hộp thư để khỏi phải tải lại lịch sử của hội thoại đang mở. */
  onLastMessage?: (message: CommissionMessage) => void;
}) {
  const messenger = variant === "messenger";
  const room = useCommissionRoom(commissionId, viewer);
  const { info, infoError, messages, addMessages, refreshInfo, refreshHistory } = room;
  const lastMessage = messages.length ? messages[messages.length - 1] : undefined;
  useEffect(() => {
    if (lastMessage) onLastMessage?.(lastMessage);
  }, [lastMessage, onLastMessage]);
  const cardIds = useMemo(() => latestCardIds(messages), [messages]);
  const onCardChanged = useCallback((incoming?: CommissionMessage[]) => {
    if (incoming?.length) addMessages(incoming);
    void refreshInfo();
    void refreshHistory();
  }, [addMessages, refreshInfo, refreshHistory]);
  const backHref = viewer === "CUSTOMER" ? "/commission" : "/staff/commission";

  if (!info) {
    return infoError ? (
      <div className="neo-box-no-hover space-y-3 border-l-8 border-l-red-600 bg-white p-5" role="alert">
        <p className="text-sm font-bold text-red-700">{infoError}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary min-h-11 text-xs font-black uppercase" onClick={room.reload}>Thử lại</button>
          <Link href={backHref} className="btn-secondary inline-flex min-h-11 items-center text-xs font-black uppercase">Về danh sách</Link>
        </div>
      </div>
    ) : (
      <p role="status" className={`flex items-center gap-2 text-sm font-bold text-text-muted ${messenger ? "p-6" : ""}`}><Loader2 className="animate-spin text-primary-ink" size={16} /> Đang mở phòng trao đổi…</p>
    );
  }

  const staffPanels = viewer === "STAFF" && (
    <>
      <StaffDraftReview commissionId={info.commissionId} status={info.status}
        drafts={info.deliveredPreviews.map((item) => ({ ...item, submissionId: item.id }))}
        onChanged={() => void room.refreshInfo()} />
      <StaffRevisionCard commissionId={info.commissionId} status={info.status}
        revisionsUsed={info.revisionsUsed} maxRevisions={info.maxRevisions} initialPrice={info.initialPrice}
        hasPendingCard={cardIds.hasPendingRevision}
        onPosted={(message) => onCardChanged([message])} />
    </>
  );
  const cardCtx: CardContext = { viewer, info, ...cardIds, onChanged: onCardChanged };

  if (messenger) {
    return (
      <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ChatPanel room={room} info={info} viewer={viewer} cardCtx={cardCtx} variant="messenger" onBack={onBack} />
        <aside aria-label="Thông tin yêu cầu" className="hidden min-h-0 space-y-4 overflow-y-auto border-l-2 border-black bg-background p-4 lg:block">
          {staffPanels}
          <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]"><CommissionInfoPanel info={info} viewer={viewer} /></div>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <ChatPanel room={room} info={info} viewer={viewer} cardCtx={cardCtx} />
      <aside className="order-first space-y-4 lg:order-none">
        {staffPanels}
        <InfoAccordion title={<>Thông tin #{info.commissionId} <span className="text-xs font-bold text-text-muted">({commissionStatusLabel(info.status)})</span></>}>
          <CommissionInfoPanel info={info} viewer={viewer} />
        </InfoAccordion>
        <div className="neo-box-no-hover sticky top-4 hidden bg-white p-5 lg:block">
          <CommissionInfoPanel info={info} viewer={viewer} />
        </div>
      </aside>
    </div>
  );
}

/** Accordion cho panel thông tin trên mobile — transitions.dev "Accordion expand". */
function InfoAccordion({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="t-acc neo-box-no-hover bg-white lg:hidden" data-open={String(open)}>
      <button type="button" className="t-acc-head flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 p-4 text-left text-sm font-black uppercase text-black"
        aria-expanded={open} aria-controls="commission-info-panel" onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <span className="t-acc-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel" id="commission-info-panel">
        <div className="t-acc-panel-inner"><div className="border-t-2 border-black p-4">{children}</div></div>
      </div>
    </div>
  );
}

/**
 * Hiệu ứng xuất hiện cho tin mới — transitions.dev "Texts reveal".
 * animate=false (lịch sử) render thẳng ở trạng thái is-shown nên không có chuyển động.
 */
function Reveal({ animate, className, children }: { animate: boolean; className: string; children: ReactNode }) {
  const [shown, setShown] = useState(!animate);
  useEffect(() => {
    if (shown) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [shown]);
  return <div className={`t-stagger ${shown ? "is-shown" : ""} ${className}`}>{children}</div>;
}

/** Chữ có dải sáng chạy qua — transitions.dev "Shimmer text". */
function Shimmer({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`t-shimmer ${className}`} data-text={text}>{text}</span>;
}

// ---------------------------------------------------------------------------
// Khung chat
// ---------------------------------------------------------------------------

type Room = ReturnType<typeof useCommissionRoom>;

/** messageId của bản xem trước và thẻ chỉnh sửa mới nhất; thẻ chỉnh sửa chỉ còn hiệu lực khi đăng sau bản xem trước mới nhất. */
function latestCardIds(messages: CommissionMessage[]) {
  let latestDeliverableId: number | undefined;
  let latestRevisionId: number | undefined;
  let latestRevisionStatus: string | undefined;
  for (const message of messages) {
    if (message.messageType === "DELIVERABLE_CARD" && message.messageId > (latestDeliverableId ?? 0)) latestDeliverableId = message.messageId;
    if (message.messageType === "EXTRA_FEE_CARD" && message.messageId > (latestRevisionId ?? 0)) {
      latestRevisionId = message.messageId;
      const status = parseMetadata(message.metadataJson)?.status;
      latestRevisionStatus = typeof status === "string" ? status : "PENDING";
    }
  }
  const hasPendingRevision = latestRevisionId !== undefined && latestRevisionId > (latestDeliverableId ?? 0) && latestRevisionStatus === "PENDING";
  return { latestDeliverableId, latestRevisionId, hasPendingRevision };
}

function ChatPanel({ room, info, viewer, cardCtx, variant = "page", onBack }: {
  room: Room; info: CommissionRoomInfo; viewer: ChatViewer; cardCtx: CardContext; variant?: "page" | "messenger"; onBack?: () => void;
}) {
  const { messages, liveIds, pending, historyLoaded, historyError, readable, canSend, realtime } = room;
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const counterpart = viewer === "CUSTOMER"
    ? info.assignedStaffName || "Nhân viên LUMINTRA"
    : info.customerName || "Khách hàng";

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages, pending]);

  function onScroll() {
    const list = listRef.current;
    if (list) stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  const grouped = useMemo(() => {
    const groups: { day: string; items: CommissionMessage[] }[] = [];
    for (const message of messages) {
      const day = formatDay(message.createdAt);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(message);
      else groups.push({ day, items: [message] });
    }
    return groups;
  }, [messages]);

  return (
    <section aria-label="Phòng chat thiết kế riêng" className={variant === "messenger"
      ? "flex h-full min-h-0 flex-col overflow-hidden bg-white"
      : "neo-box-no-hover flex h-[calc(100vh-180px)] min-h-[480px] flex-col overflow-hidden bg-white"}>
      <header className="flex items-center justify-between gap-3 border-b-2 border-black bg-white px-4 py-3">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Về danh sách hội thoại"
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] hover:bg-gray-50 lg:hidden">
            <ArrowLeft size={18} />
          </button>
        )}
        {variant === "messenger" && <CommissionAvatar commissionId={info.commissionId} size="sm" />}
        <div className="min-w-0 flex-1">
          {variant === "messenger" ? (
            <>
              <h2 className="truncate font-black uppercase text-black">{info.title}</h2>
              <p className="truncate text-xs font-semibold text-text-muted">#{info.commissionId} · {counterpart} · {commissionStatusLabel(info.status)}</p>
            </>
          ) : (
            <>
              <h1 className="truncate font-black uppercase text-black">{info.title}</h1>
              <p className="truncate text-xs font-semibold text-text-muted">Trao đổi với {counterpart} · #{info.commissionId}</p>
            </>
          )}
        </div>
        {readable && (
          <span className="flex shrink-0 items-center gap-1.5 border border-black bg-gray-50 px-2.5 py-1 text-xs font-bold text-black" role="status">
            <span className={`h-2 w-2 rounded-full ${realtime === "connected" ? "bg-emerald-500" : realtime === "connecting" ? "bg-amber-400" : "bg-gray-400"}`} />
            {realtime === "connected" ? "Trực tuyến" : realtime === "connecting" ? "Đang kết nối…" : "Mất kết nối"}
          </span>
        )}
      </header>

      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-background px-4 py-4"
        aria-live="polite" aria-busy={readable && !historyLoaded}>
        {!readable ? (
          <ChatNotReady info={info} viewer={viewer} />
        ) : !historyLoaded ? (
          <MessagesSkeleton />
        ) : (
          <>
            {historyError && (
              <div role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
                {historyError} <button type="button" className="ml-2 underline" onClick={room.reload}>Tải lại</button>
              </div>
            )}
            {messages.length === 0 && pending.length === 0 && !historyError && (
              <p className="py-8 text-center text-xs font-semibold text-text-muted">
                {viewer === "CUSTOMER"
                  ? "Phòng trao đổi đã mở. Hãy gửi lời chào và mô tả thêm ý tưởng cho nhân viên LUMINTRA nhé!"
                  : "Chưa có tin nhắn. Hãy chào khách và xác nhận yêu cầu."}
              </p>
            )}
            {grouped.map((group) => (
              <div key={group.day} className="space-y-3">
                <div className="flex justify-center">
                  <span className="border-2 border-black bg-white px-3 py-0.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000]">
                    {group.day}
                  </span>
                </div>
                {group.items.map((message) => (
                  <MessageItem key={message.messageId} message={message} viewer={viewer} info={info} animate={liveIds.has(message.messageId)} cardCtx={cardCtx} />
                ))}
              </div>
            ))}
            {pending.map((item) => (
              <PendingItem key={item.tempId} item={item} onRetry={() => room.retry(item.tempId)} onDiscard={() => room.discard(item.tempId)} />
            ))}
          </>
        )}
      </div>

      {readable && (canSend ? (
        <Composer onSend={(text, file) => { stickToBottom.current = true; room.send(text, file); }} />
      ) : (
        <p className="border-t-2 border-black bg-gray-100 px-4 py-3 text-center text-xs font-bold text-text-muted">
          {info.status === "COMPLETED"
            ? "Yêu cầu thiết kế đã hoàn thành. Bạn vẫn có thể xem lại lịch sử trao đổi."
            : "Phòng trao đổi không còn hoạt động ở trạng thái hiện tại."}
        </p>
      ))}
    </section>
  );
}

/** Skeleton bubble khi đang tải lịch sử — phần pulse của transitions.dev "Skeleton loader". */
function MessagesSkeleton() {
  const rows = [["items-start", "w-48"], ["items-end", "w-64"], ["items-start", "w-56"], ["items-end", "w-40"]];
  return (
    <div className="t-skel-skeleton is-pulsing space-y-3" style={{ "--pulse-count": "infinite" } as CSSProperties}>
      <span className="sr-only" role="status">Đang tải tin nhắn…</span>
      {rows.map(([align, width], index) => (
        <div key={index} className={`flex flex-col ${align}`} aria-hidden="true">
          <div className={`h-10 ${width} max-w-[80%] border-2 border-black/20 bg-gray-200`} />
        </div>
      ))}
    </div>
  );
}

function ChatNotReady({ info, viewer }: { info: CommissionRoomInfo; viewer: ChatViewer }) {
  const waiting = info.status === "PENDING_PAYMENT" || info.status === "PENDING_REVIEW";
  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      {waiting && <Loader2 className="mx-auto animate-spin text-primary-ink" size={28} aria-hidden="true" />}
      <p className="font-bold text-black" role="status">
        {info.status === "PENDING_PAYMENT"
          ? <Shimmer text="Đang chờ xác nhận thanh toán…" />
          : info.status === "PENDING_REVIEW"
            ? "Yêu cầu đang chờ nhân viên duyệt. Phòng trao đổi mở sau khi thanh toán."
            : `Phòng trao đổi không khả dụng (${commissionStatusLabel(info.status)}).`}
      </p>
      {info.status === "PENDING_PAYMENT" && (
        <p className="text-xs font-medium text-text-muted">Phòng trao đổi sẽ tự mở ngay khi hệ thống ghi nhận giao dịch.</p>
      )}
      {viewer === "CUSTOMER" && info.status === "PENDING_PAYMENT" && (
        <Link href={`/commission/${info.commissionId}/payment`} className="btn-primary inline-flex min-h-11 items-center text-xs font-black uppercase">
          Quay lại trang thanh toán
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tin nhắn
// ---------------------------------------------------------------------------

function senderLabel(message: CommissionMessage, viewer: ChatViewer, info: CommissionRoomInfo) {
  if (message.senderRole === "CUSTOMER") return viewer === "CUSTOMER" ? "Bạn" : info.customerName || "Khách hàng";
  if (viewer === "CUSTOMER") return info.assignedStaffName || "Nhân viên LUMINTRA";
  const role = message.senderRole === "MANAGER" ? "Manager" : message.senderRole === "ADMIN" ? "Admin" : "Staff";
  return message.senderId ? `${role} #${message.senderId}` : role;
}

function MessageItem({ message, viewer, info, animate, cardCtx }: {
  message: CommissionMessage; viewer: ChatViewer; info: CommissionRoomInfo; animate: boolean; cardCtx: CardContext;
}) {
  if (message.messageType === "SYSTEM" || message.senderRole === "SYSTEM") {
    return (
      <Reveal animate={animate} className="flex justify-center">
        <p className="t-stagger-line t-stagger-line--1 max-w-[85%] border-2 border-black bg-primary/10 px-3 py-1.5 text-center text-xs font-bold text-black">
          {formatCommissionSystemMessage(message.content)} <span className="font-semibold text-text-muted">· {formatTime(message.createdAt)}</span>
        </p>
      </Reveal>
    );
  }

  const isCustomerSide = message.senderRole === "CUSTOMER";
  const mine = viewer === "CUSTOMER" ? isCustomerSide : !isCustomerSide;

  return (
    <Reveal animate={animate} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      {!mine && <span className="t-stagger-line t-stagger-line--1 mb-1 px-1 text-xs font-bold text-text-muted">{senderLabel(message, viewer, info)}</span>}
      {message.messageType === "DELIVERABLE_CARD" ? (
        <div className="t-stagger-line t-stagger-line--2"><DeliverableCard message={message} ctx={cardCtx} /></div>
      ) : message.messageType === "EXTRA_FEE_CARD" ? (
        <div className="t-stagger-line t-stagger-line--2"><RevisionCard message={message} ctx={cardCtx} /></div>
      ) : (
        <div className={`t-stagger-line t-stagger-line--2 max-w-[80%] overflow-hidden border-2 border-black shadow-[3px_3px_0_0_#000] ${mine ? "bg-primary text-black" : "bg-white text-text-main"}`}>
          {message.messageType === "IMAGE" && isHttpUrl(message.mediaUrl) && (
            <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="block border-b border-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={message.mediaUrl} alt={message.content || "Ảnh đính kèm"} loading="lazy" decoding="async" className="h-60 w-72 max-w-full bg-white object-contain [image-rendering:pixelated]" />
            </a>
          )}
          {message.content && <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-sm font-medium">{message.content}</p>}
        </div>
      )}
      <span className="t-stagger-line t-stagger-line--3 mt-1 px-1 text-[11px] font-semibold text-text-muted">{formatTime(message.createdAt)}</span>
    </Reveal>
  );
}

function PendingItem({ item, onRetry, onDiscard }: { item: PendingMessage; onRetry: () => void; onDiscard: () => void }) {
  return (
    <Reveal animate className="flex flex-col items-end">
      <div className={`t-stagger-line t-stagger-line--1 max-w-[80%] overflow-hidden border-2 border-black bg-primary text-black shadow-[3px_3px_0_0_#000] ${item.failed ? "opacity-60" : "opacity-80"}`}>
        {item.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="Ảnh đang gửi" className="h-60 w-72 max-w-full bg-white object-contain" />
        )}
        {item.content && <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-sm font-medium">{item.content}</p>}
      </div>
      {item.failed ? (
        <span className="t-stagger-line t-stagger-line--2 mt-1 flex flex-wrap items-center justify-end gap-x-2 px-1 text-xs font-bold text-red-700" role="alert">
          {item.failed}
          <button type="button" onClick={onRetry} className="flex min-h-11 cursor-pointer items-center gap-1 px-1 underline"><RotateCcw size={14} aria-hidden="true" />Thử lại</button>
          <button type="button" onClick={onDiscard} className="flex min-h-11 cursor-pointer items-center gap-1 px-1 underline"><Trash2 size={14} aria-hidden="true" />Xóa</button>
        </span>
      ) : (
        <span className="t-stagger-line t-stagger-line--2 mt-1 px-1 text-[11px] font-semibold text-text-muted" role="status"><Shimmer text="Đang gửi…" /></span>
      )}
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Ô nhập
// ---------------------------------------------------------------------------

function Composer({ onSend }: { onSend: (text: string, file?: File) => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const shakeTarget = useRef<HTMLDivElement>(null);
  const revertTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => clearTimeout(revertTimer.current), []);

  /** transitions.dev "Error state shake": replay rung (remove → reflow → add), tự ẩn lỗi sau --revert-hold. */
  function showError(message: string) {
    setError(message);
    const el = shakeTarget.current;
    if (!el) return;
    const cs = getComputedStyle(document.documentElement);
    const ms = (name: string, fallback: number) => {
      const value = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    el.classList.remove("is-shaking");
    void el.offsetWidth;
    el.classList.add("is-shaking");
    const shakeMs = ms("--shake-dur-a", 80) * 2 + ms("--shake-dur-b", 60) * 2;
    setTimeout(() => el.classList.remove("is-shaking"), shakeMs + 20);
    clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setError(""), shakeMs + ms("--revert-hold", 3000));
  }

  function clearError() {
    clearTimeout(revertTimer.current);
    setError("");
  }

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_MESSAGE_LENGTH;
  const canSubmit = (file || trimmed.length > 0) && !tooLong;

  function pickFile(selected?: File) {
    clearError();
    if (!selected) return;
    if (!ALLOWED_IMAGE_TYPES.includes(selected.type)) return showError("Chỉ hỗ trợ ảnh PNG, JPG, WEBP hoặc GIF.");
    if (selected.size > MAX_IMAGE_BYTES) return showError("Ảnh tối đa 10MB.");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function clearFile() {
    setFile(undefined);
    setPreview(undefined);
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (tooLong) return showError(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`);
    if (!canSubmit) return;
    onSend(trimmed, file);
    setText("");
    setFile(undefined);
    setPreview(undefined); // object URL cũ được revoke bởi effect; hook tự tạo URL riêng cho tin đang gửi
    if (fileInput.current) fileInput.current.value = "";
  }

  /** Enter gửi, Shift+Enter xuống dòng; bỏ qua Enter dùng để xác nhận chữ của bộ gõ (Unikey/IME, keyCode 229) và phím giữ lặp. */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (event.nativeEvent.isComposing || event.keyCode === 229 || event.repeat) return;
    submit();
  }

  return (
    <form onSubmit={submit} className="border-t-2 border-black bg-white p-3">
      {preview && (
        <div className="relative mb-2.5 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Ảnh sẽ gửi" className="h-20 border-2 border-black bg-gray-50 object-contain" />
          <button type="button" onClick={clearFile} aria-label="Bỏ ảnh" className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] hover:bg-red-50"><X size={12} /></button>
        </div>
      )}
      <p role="alert" className={`mb-2 text-xs font-bold text-red-700 ${error ? "" : "sr-only"}`}>{error}</p>
      <div ref={shakeTarget} className="t-input flex items-end gap-2">
        <input ref={fileInput} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} />
        <button type="button" onClick={() => fileInput.current?.click()} aria-label="Đính kèm ảnh"
          className="btn-secondary flex h-11 w-11 shrink-0 items-center justify-center p-0">
          <ImagePlus size={18} />
        </button>
        <label className="sr-only" htmlFor="commission-chat-input">Tin nhắn</label>
        <textarea id="commission-chat-input" rows={1} value={text} onChange={(event) => { setText(event.target.value); if (error) clearError(); }} onKeyDown={onKeyDown}
          aria-invalid={Boolean(error) || tooLong}
          placeholder={file ? "Thêm chú thích cho ảnh (không bắt buộc)…" : "Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"}
          className={`max-h-40 min-h-11 flex-1 resize-y border-2 bg-gray-50 px-3 py-2.5 text-sm font-medium text-text-main transition-colors focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${error || tooLong ? "border-red-600" : "border-black"}`} />
        <button type="submit" disabled={!file && trimmed.length === 0} aria-label="Gửi"
          className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center p-0">
          <Send size={18} />
        </button>
      </div>
      {trimmed.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <p className={`mt-1 text-right text-xs font-bold ${tooLong ? "text-red-700" : "text-text-muted"}`}>{trimmed.length}/{MAX_MESSAGE_LENGTH}</p>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Bảng thông tin Commission
// ---------------------------------------------------------------------------

function CommissionInfoPanel({ info, viewer }: { info: CommissionRoomInfo; viewer: ChatViewer }) {
  const rows: [string, string | null | undefined][] = [
    ["Mã", `#${info.commissionId}`],
    ["Trạng thái", commissionStatusLabel(info.status)],
    ["Khách hàng", viewer === "STAFF" ? info.customerName : undefined],
    ["Điện thoại", viewer === "STAFF" ? info.customerPhone : undefined],
    ["Gói", info.tierCode],
    ["Kích thước LED", info.targetMatrixDimensions],
    ["Giá ban đầu", typeof info.initialPrice === "number" ? formatPrice(info.initialPrice) : undefined],
    ["Phí bổ sung", info.extraRevisionFee ? formatPrice(info.extraRevisionFee) : undefined],
    ["Tổng", typeof info.totalPrice === "number" ? formatPrice(info.totalPrice) : undefined],
    ["Lượt chỉnh sửa", typeof info.maxRevisions === "number" ? `${info.revisionsUsed ?? 0}/${info.maxRevisions}` : undefined],
    ["Hạn bàn giao", formatDateTime(info.slaDueAt)],
    ["Staff phụ trách", info.assignedStaffName],
    ["Designer", viewer === "STAFF" ? info.assignedDesignerName : undefined],
    ["Ngày tạo", formatDateTime(info.createdAt)],
  ];

  return (
    <div className="space-y-4 text-xs">
      <div className="border-b-2 border-black pb-3">
        <h2 className="break-words text-base font-black uppercase text-black">{info.title}</h2>
        <span className="mt-1.5 inline-block border border-black bg-primary/15 px-2 py-0.5 text-[11px] font-black uppercase text-primary-ink">
          {commissionStatusLabel(info.status)}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold text-text-muted">{label}</dt>
            <dd className="text-right font-black text-black">{value}</dd>
          </div>
        ))}
      </dl>
      {info.description && (
        <div className="border-t-2 border-dashed border-black pt-3">
          <h3 className="mb-1.5 font-black uppercase text-black">Mô tả yêu cầu</h3>
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words border-2 border-black bg-background p-2.5 text-xs leading-relaxed text-text-main">{info.description}</p>
        </div>
      )}
      {info.attachments.length > 0 && (
        <ImageGrid title="Ảnh tham khảo" items={info.attachments.map((item) => ({ key: item.id, url: item.imageUrl, label: item.caption || "Ảnh tham khảo" }))} />
      )}
      {info.deliveredPreviews.length > 0 && (
        <ImageGrid title={viewer === "STAFF" ? "Bản nộp của designer" : "Bản xem trước đã giao"}
          items={info.deliveredPreviews.map((item) => ({
            key: item.id, url: item.imageUrl,
            label: viewer === "STAFF" ? `v${item.versionNumber} · ${SUBMISSION_STATUS_LABELS[item.status] ?? item.status}` : `v${item.versionNumber}`,
          }))} />
      )}
    </div>
  );
}

function ImageGrid({ title, items }: { title: string; items: { key: number; url: string; label: string }[] }) {
  const safe = items.filter((item) => isHttpUrl(item.url));
  if (safe.length === 0) return null;
  return (
    <div className="border-t-2 border-dashed border-black pt-3">
      <h3 className="mb-2 font-black uppercase text-black">{title}</h3>
      <ul className="grid grid-cols-3 gap-2">
        {safe.map((item) => (
          <li key={item.key}>
            <a href={item.url} target="_blank" rel="noreferrer" title={item.label} className="block overflow-hidden border-2 border-black bg-white shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.label} loading="lazy" decoding="async" className="aspect-square w-full bg-black object-contain [image-rendering:pixelated]" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
