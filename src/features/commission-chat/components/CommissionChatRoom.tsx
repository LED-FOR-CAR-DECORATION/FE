"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ImagePlus, Loader2, RotateCcw, Send, Trash2, X } from "lucide-react";
import "@/styles/transitions.css";
import { formatPrice } from "@/lib/currency";
import StaffDraftReview from "@/features/commission/components/StaffDraftReview";
import StaffRevisionCard from "@/features/commission/components/StaffRevisionCard";
import { DeliverableCard, RevisionCard, type CardContext } from "./CommissionCards";
import { commissionStatusLabel } from "../commission-status";
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

export default function CommissionChatRoom({ commissionId, viewer }: { commissionId: number; viewer: ChatViewer }) {
  const room = useCommissionRoom(commissionId, viewer);
  const { info, infoError, messages, addMessages, refreshInfo } = room;
  const cardIds = useMemo(() => latestCardIds(messages), [messages]);
  const onCardChanged = useCallback((incoming?: CommissionMessage[]) => {
    if (incoming?.length) addMessages(incoming);
    void refreshInfo();
  }, [addMessages, refreshInfo]);
  const backHref = viewer === "CUSTOMER" ? "/commission" : "/staff/commission";

  if (!info) {
    return infoError ? (
      <div className="space-y-3 rounded-xl border border-[#cfe3d0] bg-white p-5" role="alert">
        <p>{infoError}</p>
        <div className="flex gap-4">
          <button type="button" className="font-semibold text-[#155e59] underline" onClick={room.reload}>Thử lại</button>
          <Link href={backHref} className="font-semibold text-[#155e59] underline">Về danh sách</Link>
        </div>
      </div>
    ) : (
      <p role="status" className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Đang mở phòng chat…</p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <ChatPanel room={room} info={info} viewer={viewer}
        cardCtx={{ viewer, info, ...cardIds, onChanged: onCardChanged }} />
      <aside className="order-first space-y-4 lg:order-none">
        {viewer === "STAFF" && (
          <StaffDraftReview commissionId={info.commissionId} status={info.status}
            drafts={info.deliveredPreviews.map((item) => ({ ...item, submissionId: item.id }))}
            onChanged={() => void room.refreshInfo()} />
        )}
        {viewer === "STAFF" && (
          <StaffRevisionCard commissionId={info.commissionId} status={info.status}
            revisionsUsed={info.revisionsUsed} maxRevisions={info.maxRevisions} initialPrice={info.initialPrice}
            hasPendingCard={cardIds.hasPendingRevision}
            onPosted={(message) => onCardChanged([message])} />
        )}
        <InfoAccordion title={<>Thông tin Commission #{info.commissionId} <span className="text-sm font-normal">({commissionStatusLabel(info.status)})</span></>}>
          <CommissionInfoPanel info={info} viewer={viewer} />
        </InfoAccordion>
        <div className="sticky top-4 hidden rounded-xl border border-[#cfe3d0] bg-white p-5 lg:block">
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
    <div className="t-acc rounded-xl border border-[#cfe3d0] bg-white lg:hidden" data-open={String(open)}>
      <button type="button" className="t-acc-head flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left font-bold text-[#155e59]"
        aria-expanded={open} aria-controls="commission-info-panel" onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <span className="t-acc-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel" id="commission-info-panel">
        <div className="t-acc-panel-inner"><div className="border-t border-[#cfe3d0] p-4">{children}</div></div>
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

function ChatPanel({ room, info, viewer, cardCtx }: { room: Room; info: CommissionRoomInfo; viewer: ChatViewer; cardCtx: CardContext }) {
  const { messages, liveIds, pending, historyLoaded, historyError, readable, canSend, realtime } = room;
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const counterpart = viewer === "CUSTOMER"
    ? info.assignedStaffName || "Nhân viên MIRAGE"
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
    <section aria-label="Phòng chat Commission" className="flex h-[calc(100vh-180px)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-[#cfe3d0] bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-[#cfe3d0] px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-black text-[#155e59]">{info.title}</h1>
          <p className="truncate text-sm text-[#526159]">Trao đổi với {counterpart} · #{info.commissionId}</p>
        </div>
        {readable && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-[#526159]" role="status">
            <span className={`h-2 w-2 rounded-full ${realtime === "connected" ? "bg-emerald-500" : realtime === "connecting" ? "bg-amber-400" : "bg-gray-400"}`} />
            {realtime === "connected" ? "Trực tuyến" : realtime === "connecting" ? "Đang kết nối…" : "Mất kết nối, đang thử lại"}
          </span>
        )}
      </header>

      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#f7faf6] px-4 py-4"
        aria-live="polite" aria-busy={readable && !historyLoaded}>
        {!readable ? (
          <ChatNotReady info={info} viewer={viewer} />
        ) : !historyLoaded ? (
          <MessagesSkeleton />
        ) : (
          <>
            {historyError && (
              <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {historyError} <button type="button" className="font-semibold underline" onClick={room.reload}>Tải lại</button>
              </div>
            )}
            {messages.length === 0 && pending.length === 0 && !historyError && (
              <p className="py-8 text-center text-sm text-[#526159]">
                {viewer === "CUSTOMER"
                  ? "Phòng chat đã mở. Hãy gửi lời chào và mô tả thêm ý tưởng cho nhân viên MIRAGE nhé!"
                  : "Chưa có tin nhắn. Hãy chào khách và xác nhận yêu cầu."}
              </p>
            )}
            {grouped.map((group) => (
              <div key={group.day} className="space-y-3">
                <div className="flex justify-center"><span className="rounded-full bg-white px-3 py-0.5 text-xs text-[#526159] shadow-sm">{group.day}</span></div>
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
        <p className="border-t border-[#cfe3d0] bg-[#f4f4f4] px-4 py-3 text-center text-sm text-[#526159]">
          {info.status === "COMPLETED"
            ? "Commission đã hoàn thành. Bạn vẫn có thể xem lại lịch sử trao đổi."
            : "Phòng chat không còn hoạt động ở trạng thái hiện tại."}
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
          <div className={`h-10 ${width} max-w-[80%] rounded-2xl bg-[#dfe9dd]`} />
        </div>
      ))}
    </div>
  );
}

function ChatNotReady({ info, viewer }: { info: CommissionRoomInfo; viewer: ChatViewer }) {
  const waiting = info.status === "PENDING_PAYMENT" || info.status === "PENDING_REVIEW";
  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      {waiting && <Loader2 className="mx-auto animate-spin text-[#155e59]" size={28} aria-hidden="true" />}
      <p className="font-semibold" role="status">
        {info.status === "PENDING_PAYMENT"
          ? <Shimmer text="Đang chờ xác nhận thanh toán…" />
          : info.status === "PENDING_REVIEW"
            ? "Yêu cầu đang chờ nhân viên duyệt. Phòng chat mở sau khi thanh toán."
            : `Phòng chat không khả dụng (${commissionStatusLabel(info.status)}).`}
      </p>
      {info.status === "PENDING_PAYMENT" && (
        <p className="text-sm text-[#526159]">Phòng chat sẽ tự mở ngay khi hệ thống ghi nhận giao dịch.</p>
      )}
      {viewer === "CUSTOMER" && info.status === "PENDING_PAYMENT" && (
        <Link href={`/commission/${info.commissionId}/payment`} className="inline-block font-semibold text-[#155e59] underline">Quay lại trang thanh toán</Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tin nhắn
// ---------------------------------------------------------------------------

function senderLabel(message: CommissionMessage, viewer: ChatViewer, info: CommissionRoomInfo) {
  if (message.senderRole === "CUSTOMER") return viewer === "CUSTOMER" ? "Bạn" : info.customerName || "Khách hàng";
  if (viewer === "CUSTOMER") return info.assignedStaffName || "Nhân viên MIRAGE";
  const role = message.senderRole === "MANAGER" ? "Manager" : message.senderRole === "ADMIN" ? "Admin" : "Staff";
  return message.senderId ? `${role} #${message.senderId}` : role;
}

function MessageItem({ message, viewer, info, animate, cardCtx }: {
  message: CommissionMessage; viewer: ChatViewer; info: CommissionRoomInfo; animate: boolean; cardCtx: CardContext;
}) {
  if (message.messageType === "SYSTEM" || message.senderRole === "SYSTEM") {
    return (
      <Reveal animate={animate} className="flex justify-center">
        <p className="t-stagger-line t-stagger-line--1 max-w-[85%] rounded-lg bg-[#e6f0e4] px-3 py-1.5 text-center text-xs text-[#26352f]">
          {message.content} <span className="text-[#526159]">· {formatTime(message.createdAt)}</span>
        </p>
      </Reveal>
    );
  }

  const isCustomerSide = message.senderRole === "CUSTOMER";
  const mine = viewer === "CUSTOMER" ? isCustomerSide : !isCustomerSide;

  return (
    <Reveal animate={animate} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      {!mine && <span className="t-stagger-line t-stagger-line--1 mb-0.5 px-1 text-xs text-[#526159]">{senderLabel(message, viewer, info)}</span>}
      {message.messageType === "DELIVERABLE_CARD" ? (
        <div className="t-stagger-line t-stagger-line--2"><DeliverableCard message={message} ctx={cardCtx} /></div>
      ) : message.messageType === "EXTRA_FEE_CARD" ? (
        <div className="t-stagger-line t-stagger-line--2"><RevisionCard message={message} ctx={cardCtx} /></div>
      ) : (
        <div className={`t-stagger-line t-stagger-line--2 max-w-[80%] overflow-hidden rounded-2xl ${mine ? "rounded-br-sm bg-[#155e59] text-white" : "rounded-bl-sm border border-[#cfe3d0] bg-white"}`}>
          {message.messageType === "IMAGE" && isHttpUrl(message.mediaUrl) && (
            <a href={message.mediaUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={message.mediaUrl} alt={message.content || "Ảnh đính kèm"} loading="lazy" decoding="async" className="h-60 w-72 max-w-full bg-black/5 object-contain [image-rendering:pixelated]" />
            </a>
          )}
          {message.content && <p className="whitespace-pre-wrap break-words px-3 py-2">{message.content}</p>}
        </div>
      )}
      <span className="t-stagger-line t-stagger-line--3 mt-0.5 px-1 text-[11px] text-[#5f6f67]">{formatTime(message.createdAt)}</span>
    </Reveal>
  );
}

function PendingItem({ item, onRetry, onDiscard }: { item: PendingMessage; onRetry: () => void; onDiscard: () => void }) {
  return (
    <Reveal animate className="flex flex-col items-end">
      <div className={`t-stagger-line t-stagger-line--1 max-w-[80%] overflow-hidden rounded-2xl rounded-br-sm bg-[#155e59] text-white ${item.failed ? "opacity-60" : "opacity-80"}`}>
        {item.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="Ảnh đang gửi" className="h-60 w-72 max-w-full object-contain" />
        )}
        {item.content && <p className="whitespace-pre-wrap break-words px-3 py-2">{item.content}</p>}
      </div>
      {item.failed ? (
        <span className="t-stagger-line t-stagger-line--2 mt-0.5 flex flex-wrap items-center justify-end gap-x-2 px-1 text-xs text-red-700" role="alert">
          {item.failed}
          <button type="button" onClick={onRetry} className="flex min-h-11 items-center gap-1 px-1 font-semibold underline"><RotateCcw size={14} aria-hidden="true" />Thử lại</button>
          <button type="button" onClick={onDiscard} className="flex min-h-11 items-center gap-1 px-1 font-semibold underline"><Trash2 size={14} aria-hidden="true" />Xóa</button>
        </span>
      ) : (
        <span className="t-stagger-line t-stagger-line--2 mt-0.5 px-1 text-[11px]" role="status"><Shimmer text="Đang gửi…" /></span>
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
    <form onSubmit={submit} className="border-t border-[#cfe3d0] bg-white p-3">
      {preview && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Ảnh sẽ gửi" className="h-20 rounded-lg border border-[#cfe3d0] object-contain" />
          <button type="button" onClick={clearFile} aria-label="Bỏ ảnh" className="absolute -right-2 -top-2 rounded-full bg-black p-0.5 text-white"><X size={14} /></button>
        </div>
      )}
      <p role="alert" className={`mb-2 text-sm text-red-700 ${error ? "" : "sr-only"}`}>{error}</p>
      <div ref={shakeTarget} className="t-input flex items-end gap-2">
        <input ref={fileInput} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} />
        <button type="button" onClick={() => fileInput.current?.click()} aria-label="Đính kèm ảnh"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#cfe3d0] text-[#155e59] hover:bg-[#eaf5e8]">
          <ImagePlus size={20} />
        </button>
        <label className="sr-only" htmlFor="commission-chat-input">Tin nhắn</label>
        <textarea id="commission-chat-input" rows={1} value={text} onChange={(event) => { setText(event.target.value); if (error) clearError(); }} onKeyDown={onKeyDown}
          aria-invalid={Boolean(error) || tooLong}
          placeholder={file ? "Thêm chú thích cho ảnh (không bắt buộc)…" : "Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"}
          className={`max-h-40 min-h-11 flex-1 resize-y rounded-lg border px-3 py-2.5 transition-[border-color] duration-150 ${error || tooLong ? "border-red-600" : "border-[#819e8c]"} focus:outline-none focus:ring-2 focus:ring-[#155e59]`} />
        <button type="submit" disabled={!file && trimmed.length === 0} aria-label="Gửi"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#155e59] text-white hover:bg-[#0e4b47] disabled:opacity-40">
          <Send size={18} />
        </button>
      </div>
      {trimmed.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <p className={`mt-1 text-right text-xs ${tooLong ? "text-red-700" : "text-[#526159]"}`}>{trimmed.length}/{MAX_MESSAGE_LENGTH}</p>
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
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="break-words text-lg font-black text-[#155e59]">{info.title}</h2>
        <span className="mt-1 inline-block rounded-full bg-[#eaf5e8] px-2.5 py-0.5 text-xs font-semibold text-[#155e59]">
          {commissionStatusLabel(info.status)}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[#526159]">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {info.description && (
        <div>
          <h3 className="mb-1 font-bold">Mô tả yêu cầu</h3>
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-[#f7faf6] p-2">{info.description}</p>
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
    <div>
      <h3 className="mb-1 font-bold">{title}</h3>
      <ul className="grid grid-cols-3 gap-2">
        {safe.map((item) => (
          <li key={item.key}>
            <a href={item.url} target="_blank" rel="noreferrer" title={item.label} className="block overflow-hidden rounded-lg border border-[#cfe3d0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.label} loading="lazy" decoding="async" className="aspect-square w-full bg-black object-contain [image-rendering:pixelated]" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
