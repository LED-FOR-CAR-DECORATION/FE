"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Download,
  ExternalLink,
  ImagePlus,
  Send,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";
import {
  canReadHistory,
  CHAT_ACTIVE_STATUSES,
  listCommissionMessages,
  parseMetadata,
  sendCommissionMessage,
  uploadCommissionChatImage,
  type CommissionMessage,
} from "@/features/commission-chat/services/commission-messages.api";
import { resolveImageMimeAndExtension } from "@/lib/api/media";
import { commissionErrorMessage, isRequestCancelled } from "../errors";
import { formatCommissionDate } from "../config/statusMeta";
import type { CommissionManagementDetail } from "../services/management-commission.api";

export type MediaCategory = "SENT_TO_CUSTOMER" | "DESIGNER_DRAFT" | "CUSTOMER_REFERENCE";
export type MediaCategoryFilter = "ALL" | MediaCategory;

interface ManagedImageItem {
  id: string;
  url: string;
  category: MediaCategory;
  title: string;
  badgeText: string;
  badgeClassName: string;
  subtitle?: string | null;
  note?: string | null;
  createdAt?: string | null;
}

const SUBMISSION_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  CUSTOMER_ACCEPTED: {
    label: "Khách đã chấp nhận",
    className: "border-black bg-primary text-black",
  },
  STAFF_APPROVED: {
    label: "Đã duyệt gửi khách",
    className: "border-black bg-primary/25 text-primary-ink",
  },
  PENDING_STAFF_REVIEW: {
    label: "Chờ staff duyệt",
    className: "border-amber-600 bg-amber-50 text-amber-900",
  },
  STAFF_REJECTED: {
    label: "Đã trả lại sửa",
    className: "border-red-600 bg-red-50 text-red-700",
  },
};

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export interface CommissionMediaManagerProps {
  detail: CommissionManagementDetail;
  onChanged: () => void;
  onLightboxChange?: (open: boolean) => void;
}

export default function CommissionMediaManager({
  detail,
  onChanged,
  onLightboxChange,
}: CommissionMediaManagerProps) {
  const [messages, setMessages] = useState<CommissionMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [filter, setFilter] = useState<MediaCategoryFilter>("ALL");
  const [pixelated, setPixelated] = useState(true);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});
  const [lightboxItem, setLightboxItem] = useState<ManagedImageItem | null>(null);

  // Upload & send chat image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendPendingRef = useRef(false);

  const historyReadable = canReadHistory(detail.status);
  const chatActive = CHAT_ACTIVE_STATUSES.has(detail.status);

  useEffect(() => {
    onLightboxChange?.(Boolean(lightboxItem));
  }, [lightboxItem, onLightboxChange]);

  useEffect(() => {
    if (!lightboxItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        setLightboxItem(null);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [lightboxItem]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function fetchChatImages() {
    if (!historyReadable) {
      setMessages([]);
      setMessagesError("");
      return;
    }
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const response = await listCommissionMessages(detail.commissionId);
      setMessages(response.data ?? []);
    } catch (failure) {
      setMessagesError(
        commissionErrorMessage(failure, "Không tải được lịch sử ảnh trong phòng chat."),
      );
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (!historyReadable) {
      setMessages([]);
      setMessagesError("");
      return () => {
        active = false;
      };
    }
    setMessagesLoading(true);
    setMessagesError("");
    const req = listCommissionMessages(detail.commissionId);
    req
      .then((response) => {
        if (active) setMessages(response.data ?? []);
      })
      .catch((failure) => {
        if (active && !isRequestCancelled(failure)) {
          setMessagesError(
            commissionErrorMessage(failure, "Không tải được lịch sử ảnh trong phòng chat."),
          );
        }
      })
      .finally(() => {
        if (active) setMessagesLoading(false);
      });
    return () => {
      active = false;
      req.cancel();
    };
  }, [detail.commissionId, detail.status, historyReadable]);

  const items = useMemo<ManagedImageItem[]>(() => {
    const result: ManagedImageItem[] = [];
    const sentUrlsSeen = new Set<string>();

    // 1. Submissions approved/delivered to customer first
    for (const sub of detail.submissions ?? []) {
      if (!sub.imageUrl) continue;
      const isSent = sub.status === "STAFF_APPROVED" || sub.status === "CUSTOMER_ACCEPTED";
      const badge = SUBMISSION_STATUS_BADGE[sub.status] ?? {
        label: sub.status,
        className: "border-black bg-neutral-100 text-black",
      };
      if (isSent) sentUrlsSeen.add(sub.imageUrl);
      result.push({
        id: `sub-${sub.submissionId}`,
        url: sub.imageUrl,
        category: isSent ? "SENT_TO_CUSTOMER" : "DESIGNER_DRAFT",
        title: `Bản vẽ v${sub.versionNumber}`,
        badgeText: badge.label,
        badgeClassName: badge.className,
        subtitle: sub.designerName ? `Họa sĩ: ${sub.designerName}` : null,
        note: sub.staffReviewNote || sub.designerNote || null,
        createdAt: sub.deliveredAt || sub.reviewedAt || sub.createdAt || null,
      });
    }

    // 2. Chat messages (DELIVERABLE_CARD & IMAGE)
    for (const msg of messages) {
      if (msg.messageType === "DELIVERABLE_CARD") {
        const meta = parseMetadata(msg.metadataJson);
        const image = [msg.mediaUrl, meta?.imageUrl].find(isHttpUrl);
        if (!image || sentUrlsSeen.has(image)) continue;
        sentUrlsSeen.add(image);
        const version =
          typeof meta?.versionNumber === "number" ? `v${meta.versionNumber}` : `#${msg.messageId}`;
        result.push({
          id: `msg-deliv-${msg.messageId}`,
          url: image,
          category: "SENT_TO_CUSTOMER",
          title: `Thẻ bàn giao ${version}`,
          badgeText: "Gửi qua thẻ deliverable",
          badgeClassName: "border-black bg-primary text-black",
          subtitle: "Từ phòng chat",
          note: msg.content,
          createdAt: msg.createdAt,
        });
      } else if (msg.messageType === "IMAGE" && isHttpUrl(msg.mediaUrl)) {
        const fromCustomer = msg.senderRole === "CUSTOMER";
        result.push({
          id: `msg-img-${msg.messageId}`,
          url: msg.mediaUrl,
          category: fromCustomer ? "CUSTOMER_REFERENCE" : "SENT_TO_CUSTOMER",
          title: fromCustomer ? `Ảnh khách gửi (#${msg.messageId})` : `Ảnh chat gửi khách (#${msg.messageId})`,
          badgeText: fromCustomer ? "Khách gửi trong chat" : `Chat · ${msg.senderRole}`,
          badgeClassName: fromCustomer
            ? "border-black bg-neutral-100 text-black"
            : "border-black bg-primary/20 text-primary-ink",
          subtitle: fromCustomer ? "Khách hàng" : "Nhân viên / Quản lý",
          note: msg.content,
          createdAt: msg.createdAt,
        });
      }
    }

    // 3. Initial customer reference attachments
    (detail.attachments ?? []).forEach((att, idx) => {
      if (!att.imageUrl) return;
      result.push({
        id: `att-${att.attachmentId}`,
        url: att.imageUrl,
        category: "CUSTOMER_REFERENCE",
        title: `Ảnh tham khảo #${idx + 1}`,
        badgeText: "Ảnh đính kèm ban đầu",
        badgeClassName: "border-black bg-white text-black",
        subtitle: "Yêu cầu khách hàng",
        note: att.caption ?? null,
        createdAt: detail.createdAt ?? null,
      });
    });

    return result;
  }, [detail.attachments, detail.createdAt, detail.submissions, messages]);

  const counts = useMemo(() => {
    let sent = 0;
    let draft = 0;
    let ref = 0;
    for (const item of items) {
      if (item.category === "SENT_TO_CUSTOMER") sent += 1;
      else if (item.category === "DESIGNER_DRAFT") draft += 1;
      else ref += 1;
    }
    return { all: items.length, sent, draft, ref };
  }, [items]);

  const filteredItems = useMemo(
    () => (filter === "ALL" ? items : items.filter((item) => item.category === filter)),
    [filter, items],
  );

  function handleSelectFile(file: File | null) {
    setSendError("");
    setSendSuccess("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSendError("Ảnh vượt quá giới hạn 10MB.");
      setSelectedFile(null);
      return;
    }
    const resolved = resolveImageMimeAndExtension(file.type, file.name);
    if (!resolved) {
      setSendError("Chỉ hỗ trợ ảnh PNG, GIF, JPG hoặc WebP.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSendImage(event: FormEvent) {
    event.preventDefault();
    if (sendPendingRef.current || !selectedFile || !chatActive) return;
    sendPendingRef.current = true;
    setSending(true);
    setSendError("");
    setSendSuccess("");
    try {
      const objectKey = await uploadCommissionChatImage(detail.commissionId, selectedFile);
      await sendCommissionMessage(detail.commissionId, {
        messageType: "IMAGE",
        mediaUrl: objectKey,
        ...(caption.trim() ? { content: caption.trim() } : {}),
      });
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSendSuccess("Đã gửi ảnh cho khách vào phòng chat.");
      await fetchChatImages();
      onChanged();
    } catch (failure) {
      setSendError(commissionErrorMessage(failure, "Không gửi được ảnh cho khách."));
    } finally {
      sendPendingRef.current = false;
      setSending(false);
    }
  }

  const filterTabs: Array<{ key: MediaCategoryFilter; label: string; count: number }> = [
    { key: "ALL", label: "Tất cả", count: counts.all },
    { key: "SENT_TO_CUSTOMER", label: "Đã gửi khách", count: counts.sent },
    { key: "DESIGNER_DRAFT", label: "Bản nháp Designer", count: counts.draft },
    { key: "CUSTOMER_REFERENCE", label: "Tham khảo khách", count: counts.ref },
  ];

  return (
    <div className="space-y-5">
      {/* Direct Send Chat Image Panel */}
      <section className="border-2 border-black bg-[#f7fbf8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black">
              <ImagePlus className="h-4 w-4" />
              Gửi ảnh trực tiếp cho khách
            </h3>
            <p className="mt-0.5 text-xs text-black/70">
              {chatActive
                ? "Ảnh gửi tại đây sẽ được lưu trong phòng chat và hiện ngay ở mục Ảnh đã gửi khách."
                : "Phòng chat hiện chưa mở hoặc đã kết thúc nên tạm thời không thể gửi thêm ảnh mới."}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-black bg-white px-2.5 py-1 text-xs font-bold text-black">
            <input
              type="checkbox"
              checked={pixelated}
              onChange={(event) => setPixelated(event.target.checked)}
              className="h-3.5 w-3.5 accent-black"
            />
            <Sparkles className="h-3.5 w-3.5 text-primary-ink" />
            Pixel sắc nét
          </label>
        </div>

        {chatActive && (
          <form onSubmit={handleSendImage} className="mt-3 space-y-3 border-t-2 border-dashed border-black/30 pt-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black hover:bg-neutral-100">
                <ImagePlus className="h-4 w-4" />
                <span>{selectedFile ? "Đổi ảnh khác" : "Chọn ảnh PNG / GIF / WebP"}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/gif,image/webp,image/jpeg"
                  disabled={sending}
                  onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>

              <input
                type="text"
                maxLength={500}
                disabled={sending}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Ghi chú kèm theo ảnh gửi khách (không bắt buộc)…"
                className="min-h-10 flex-1 border-2 border-black bg-white px-3 text-xs font-medium text-black placeholder:text-black/45 focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <button
                type="submit"
                disabled={sending || !selectedFile}
                className="btn-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Đang gửi…" : "Gửi cho khách"}
              </button>
            </div>

            {previewUrl && selectedFile && (
              <div className="flex items-center gap-3 border-2 border-black bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className={`h-16 w-16 border border-black bg-[#0d1117] object-contain ${
                    pixelated ? "[image-rendering:pixelated]" : ""
                  }`}
                />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="truncate font-bold text-black">{selectedFile.name}</p>
                  <p className="font-mono text-[11px] text-black/65">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    handleSelectFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="border-2 border-black px-2 py-1 text-xs font-bold text-black hover:bg-neutral-100"
                >
                  Bỏ chọn
                </button>
              </div>
            )}

            {sendError && (
              <p role="alert" className="border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {sendError}
              </p>
            )}
            {sendSuccess && (
              <p role="status" className="border-2 border-black bg-primary/25 px-3 py-2 text-xs font-bold text-primary-ink">
                {sendSuccess}
              </p>
            )}
          </form>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc nguồn ảnh commission">
          {filterTabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.key)}
                className={
                  active
                    ? "border-2 border-black bg-primary px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0_0_#000]"
                    : "border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-neutral-100"
                }
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {historyReadable && (
          <button
            type="button"
            disabled={messagesLoading}
            onClick={() => void fetchChatImages()}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-neutral-100 disabled:opacity-50"
          >
            {messagesLoading ? "Đang đồng bộ chat…" : "Làm mới ảnh chat"}
          </button>
        )}
      </div>

      {messagesError && (
        <p role="alert" className="border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {messagesError}
        </p>
      )}

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="border-2 border-dashed border-black/35 bg-neutral-50 p-8 text-center text-sm font-semibold text-black/65">
          {messagesLoading ? "Đang tải danh sách ảnh…" : "Chưa có hình ảnh nào trong mục này."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isBroken = Boolean(brokenUrls[item.url]);
            return (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden border-2 border-black bg-white shadow-[3px_3px_0_0_#000]"
              >
                <div className="relative flex h-44 items-center justify-center border-b-2 border-black bg-[#0d1117] p-2">
                  {isBroken ? (
                    <div className="flex flex-col items-center gap-2 text-center text-xs text-white/80">
                      <span>Không tải được xem trước ảnh</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-white/60 px-2.5 py-1 font-bold underline"
                      >
                        Mở link gốc
                      </a>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.url}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      onError={() => setBrokenUrls((prev) => ({ ...prev, [item.url]: true }))}
                      className={`max-h-full max-w-full object-contain ${
                        pixelated ? "[image-rendering:pixelated]" : ""
                      }`}
                    />
                  )}
                  <span
                    className={`absolute left-2 top-2 border px-2 py-0.5 text-[10px] font-black uppercase ${item.badgeClassName}`}
                  >
                    {item.badgeText}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between space-y-2 p-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-black">{item.title}</h4>
                      {item.createdAt && (
                        <span className="shrink-0 font-mono text-[10px] text-black/60">
                          {formatCommissionDate(item.createdAt, true)}
                        </span>
                      )}
                    </div>
                    {item.subtitle && <p className="font-semibold text-black/70">{item.subtitle}</p>}
                    {item.note && (
                      <p className="line-clamp-2 whitespace-pre-wrap break-words text-black/80">
                        {item.note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-dashed border-black/20 pt-2">
                    <button
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1 border-2 border-black bg-white px-2 py-1.5 font-bold text-black hover:bg-primary/20"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      Phóng to
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1 border-2 border-black bg-white px-2.5 py-1.5 font-bold text-black hover:bg-neutral-100"
                      title="Mở ảnh ở tab mới"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={item.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1 border-2 border-black bg-white px-2.5 py-1.5 font-bold text-black hover:bg-neutral-100"
                      title="Tải ảnh"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Zoom Lightbox */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem phóng to ${lightboxItem.title}`}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="w-full max-w-3xl border-2 border-black bg-white shadow-[8px_8px_0_0_#000]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-black bg-primary px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase text-black">{lightboxItem.title}</p>
                <p className="text-xs font-bold text-black/80">{lightboxItem.badgeText}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng xem phóng to"
                onClick={() => setLightboxItem(null)}
                className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex max-h-[68vh] items-center justify-center bg-[#0d1117] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.url}
                alt={lightboxItem.title}
                className={`max-h-[60vh] max-w-full object-contain ${
                  pixelated ? "[image-rendering:pixelated]" : ""
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-black bg-white px-4 py-3 text-xs">
              <p className="max-w-lg truncate font-medium text-black/80">
                {lightboxItem.note || lightboxItem.subtitle || "—"}
              </p>
              <a
                href={lightboxItem.url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 font-bold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Mở ảnh gốc
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
