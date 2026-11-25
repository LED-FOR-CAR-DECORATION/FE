"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Grid,
  Image as ImageIcon,
  MessageSquare,
  QrCode,
  RefreshCw,
} from "lucide-react";
import NeoDialog from "@/components/ui/NeoDialog";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";
import { formatPrice } from "@/lib/currency";
import {
  STATUS_TONE_CLASS,
  formatCommissionDate,
  getStatusMeta,
  getTierLabel,
  isPaymentPendingStatus,
  parsePriceBreakdown,
} from "../config/statusMeta";

interface CommissionDetailDialogProps {
  commissionId: number | null;
  onClose: () => void;
}

const TIMELINE_STEPS = [
  "Gửi yêu cầu",
  "Duyệt & báo giá",
  "Thanh toán",
  "Thiết kế & Trao đổi",
  "Hoàn thành",
];

function resolveStageIndex(status?: string): number {
  switch (status) {
    case "PENDING_REVIEW":
      return 1;
    case "PENDING_PAYMENT":
      return 2;
    case "PAID":
    case "IN_PROGRESS":
    case "INTERNAL_REVIEW":
    case "INTERNAL_REVISION_REQUIRED":
    case "PREVIEW_DELIVERED":
    case "AWAITING_EXTRA_PAYMENT":
    case "CUSTOMER_REVISION_REQUESTED":
    case "AWAITING_ESTIMATE":
      return 3;
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}

/**
 * Modal hiển thị thông số kỹ thuật, mô tả brief, ảnh tham khảo và bảng giá chi tiết của một yêu cầu Commission.
 */
export default function CommissionDetailDialog({ commissionId, onClose }: CommissionDetailDialogProps) {
  const [detail, setDetail] = useState<CustomerCommissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (commissionId === null) {
      setDetail(null);
      setError(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    const request = CustomerCommissionsService.getMyCommissionDetail(commissionId);
    request
      .then(({ data }) => {
        if (!active) return;
        if (!data) {
          setError(true);
          return;
        }
        setDetail(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      request.cancel();
    };
  }, [commissionId, retryCount]);

  if (commissionId === null) return null;

  const statusMeta = getStatusMeta(detail?.status);
  const breakdown = parsePriceBreakdown(detail?.priceBreakdownJson);
  const isTerminated = detail?.status === "CANCELLED" || detail?.status === "EXPIRED";
  const currentStage = resolveStageIndex(detail?.status);
  const validAttachments = (detail?.attachments ?? []).filter((item) => /^https?:\/\//i.test(item.imageUrl));
  const validPreviews = (detail?.deliveredPreviews ?? []).filter((item) => /^https?:\/\//i.test(item.imageUrl));

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onClose}
        className="btn-secondary min-h-11 text-xs font-black uppercase"
      >
        Đóng
      </button>
      {detail && isPaymentPendingStatus(detail.status) && (
        <Link
          href={`/commission/${detail.commissionId}/payment`}
          className="btn-primary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
        >
          <QrCode size={15} />
          Thanh toán ngay
        </Link>
      )}
      {detail && !isPaymentPendingStatus(detail.status) && canReadHistory(detail.status) && (
        <Link
          href={`/messages?commissionId=${detail.commissionId}`}
          className="btn-primary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
        >
          <MessageSquare size={15} />
          {detail.status === "COMPLETED" ? "Xem trao đổi" : "Mở trao đổi"}
        </Link>
      )}
    </div>
  );

  return (
    <NeoDialog
      title={detail ? `${detail.title}` : `Chi tiết yêu cầu #${commissionId}`}
      description={detail ? `Mã yêu cầu #${detail.commissionId} · Tạo lúc ${formatCommissionDate(detail.createdAt, true)}` : undefined}
      onClose={onClose}
      size="lg"
      footer={footer}
    >
      {loading ? (
        <div className="space-y-4" aria-label="Đang tải chi tiết yêu cầu">
          <div className="h-14 animate-pulse border-2 border-black bg-gray-100" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse border-2 border-black bg-gray-100" />
            <div className="h-24 animate-pulse border-2 border-black bg-gray-100" />
          </div>
          <div className="h-32 animate-pulse border-2 border-black bg-gray-100" />
        </div>
      ) : error || !detail ? (
        <div role="alert" className="border-2 border-red-600 bg-red-50 p-4 text-sm">
          <div className="flex items-start gap-2 font-bold text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>Không tải được thông tin chi tiết yêu cầu thiết kế riêng.</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="btn-secondary mt-3 min-h-11 text-xs font-black uppercase"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status + Progress */}
          <section className="space-y-3 border-2 border-black bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-xs font-black uppercase ${
                  STATUS_TONE_CLASS[statusMeta.tone]
                }`}
              >
                {statusMeta.label}
              </span>
              {detail.activePaymentCode && (
                <span className="border border-black bg-white px-2.5 py-1 text-xs font-black tabular-nums">
                  Mã thanh toán: {detail.activePaymentCode}
                </span>
              )}
            </div>
            {statusMeta.helper && <p className="text-xs font-medium text-text-muted">{statusMeta.helper}</p>}

            {!isTerminated && (
              <ol aria-label="Tiến độ yêu cầu" className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-5">
                {TIMELINE_STEPS.map((label, idx) => {
                  const done = idx < currentStage || (detail.status === "COMPLETED" && idx <= currentStage);
                  const active = idx === currentStage && detail.status !== "COMPLETED";
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-1.5 border-2 border-black px-2 py-1.5 text-xs font-bold ${
                        active
                          ? "bg-primary text-black"
                          : done
                            ? "bg-primary/20 text-primary-ink"
                            : "bg-white text-text-muted opacity-70"
                      }`}
                    >
                      <span className="grid size-5 shrink-0 place-items-center border border-black bg-white text-[11px] font-black text-black">
                        {done ? <Check size={12} /> : idx + 1}
                      </span>
                      <span className="truncate">{label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Rejection / Deadline Alerts */}
          {detail.rejectionReason && (
            <div role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
              <p className="uppercase">Lý do từ chối:</p>
              <p className="mt-1 font-medium">{detail.rejectionReason}</p>
            </div>
          )}

          {isPaymentPendingStatus(detail.status) && detail.quoteExpiresAt && (
            <div className="flex items-center gap-2 border-2 border-amber-600 bg-amber-50 p-3 text-xs font-bold text-amber-900">
              <Clock size={16} className="shrink-0" />
              <span>Hạn thanh toán: {formatCommissionDate(detail.quoteExpiresAt, true)}</span>
            </div>
          )}

          {/* Core Specs */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="border-2 border-black bg-white p-3.5">
              <h3 className="mb-2.5 border-b-2 border-black pb-1.5 text-xs font-black uppercase">
                Thông số yêu cầu
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-text-muted">Gói thiết kế</dt>
                  <dd className="font-black text-black">{breakdown?.tierName || getTierLabel(detail.tierCode)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1 font-semibold text-text-muted">
                    <Grid size={13} /> Kích thước LED
                  </dt>
                  <dd className="font-black text-black">{detail.targetMatrixDimensions || "Theo brief"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1 font-semibold text-text-muted">
                    <RefreshCw size={13} /> Lượt sửa miễn phí
                  </dt>
                  <dd className="font-black text-black">
                    {detail.revisionsUsed} / {detail.maxRevisions} lượt
                  </dd>
                </div>
                {detail.slaDueAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="flex items-center gap-1 font-semibold text-text-muted">
                      <Calendar size={13} /> Hạn bàn giao dự kiến
                    </dt>
                    <dd className="font-black text-primary-ink">{formatCommissionDate(detail.slaDueAt, true)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Price Breakdown */}
            <div className="border-2 border-black bg-white p-3.5">
              <h3 className="mb-2.5 border-b-2 border-black pb-1.5 text-xs font-black uppercase">
                Chi tiết chi phí
              </h3>
              <dl className="space-y-1.5 text-xs">
                {breakdown?.basePrice !== undefined && (
                  <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-text-muted">Giá gói cơ bản</dt>
                    <dd className="font-bold tabular-nums">{formatPrice(breakdown.basePrice)}</dd>
                  </div>
                )}
                {breakdown?.selections?.map((sel, index) => {
                  const optionSummary =
                    sel.selectedOptions && sel.selectedOptions.length > 0
                      ? sel.selectedOptions.map((o) => o.optionLabel).filter(Boolean).join(", ")
                      : sel.quantity != null
                        ? `${sel.quantity}`
                        : sel.textValue || "—";
                  const lineAmount = sel.computedLineAmount ?? 0;
                  return (
                    <div key={`${sel.configId ?? index}`} className="flex justify-between gap-2">
                      <dt className="min-w-0 text-text-muted">
                        <span className="font-semibold text-black">{sel.ruleName}:</span>{" "}
                        <span className="break-words">{optionSummary}</span>
                      </dt>
                      <dd className="shrink-0 font-bold tabular-nums">
                        {lineAmount > 0 ? `+${formatPrice(lineAmount)}` : "Mặc định"}
                      </dd>
                    </div>
                  );
                })}
                {!breakdown && (
                  <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-text-muted">Giá thiết kế ban đầu</dt>
                    <dd className="font-bold tabular-nums">{formatPrice(detail.initialPrice)}</dd>
                  </div>
                )}
                {detail.extraRevisionFee > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-text-muted">Phí chỉnh sửa phát sinh</dt>
                    <dd className="font-bold tabular-nums">+{formatPrice(detail.extraRevisionFee)}</dd>
                  </div>
                )}
                <div className="mt-2 flex justify-between gap-2 border-t-2 border-dashed border-black pt-2 text-sm">
                  <dt className="font-black uppercase">Tổng cộng</dt>
                  <dd className="font-black tabular-nums text-primary-ink">{formatPrice(detail.totalPrice)}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Description */}
          <section className="border-2 border-black bg-white p-3.5">
            <h3 className="mb-2 border-b-2 border-black pb-1.5 text-xs font-black uppercase">
              Mô tả yêu cầu (Brief)
            </h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-main">
              {detail.description?.trim() || "Không có mô tả chi tiết."}
            </p>
          </section>

          {/* Reference Attachments */}
          {validAttachments.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-black uppercase">
                <ImageIcon size={15} className="text-primary-ink" />
                Ảnh tham khảo ({validAttachments.length})
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {validAttachments.map((att, idx) => (
                  <a
                    key={att.attachmentId}
                    href={att.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.imageUrl}
                      alt={att.caption || `Ảnh tham khảo ${idx + 1}`}
                      loading="lazy"
                      className="aspect-square w-full border border-black/20 bg-gray-50 object-contain"
                    />
                    <span className="mt-1.5 flex items-center justify-between gap-1 text-xs font-bold text-primary-ink group-hover:underline">
                      <span className="truncate">{att.caption || `Ảnh ${idx + 1}`}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Delivered Previews */}
          {validPreviews.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-black uppercase text-primary-ink">
                Bản xem trước đã bàn giao ({validPreviews.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {validPreviews.map((preview) => (
                  <div key={preview.submissionId} className="border-2 border-black bg-primary/10 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black uppercase">
                      <span>Phiên bản v{preview.versionNumber}</span>
                      <span>{formatCommissionDate(preview.deliveredAt ?? preview.createdAt)}</span>
                    </div>
                    <a
                      href={preview.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block border-2 border-black bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview.imageUrl}
                        alt={`Bản xem trước v${preview.versionNumber}`}
                        loading="lazy"
                        className="aspect-video w-full object-contain"
                      />
                    </a>
                    {preview.designerNote && (
                      <p className="mt-2 break-words text-xs font-medium text-text-main">
                        {preview.designerNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </NeoDialog>
  );
}
