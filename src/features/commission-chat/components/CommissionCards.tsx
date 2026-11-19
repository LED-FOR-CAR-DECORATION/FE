"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatPrice } from "@/lib/currency";
import { commissionErrorMessage } from "@/features/commission/errors";
import {
  approveDeliverableCard,
  cancelRevisionCheckout,
  confirmRevisionCard,
} from "@/features/commission/services/customer-commission.api";
import type { ChatViewer, CommissionRoomInfo } from "../hooks/useCommissionRoom";
import { parseMetadata, type CommissionMessage } from "../services/commission-messages.api";

/** Thông tin chung để thẻ biết mình có còn hiệu lực và ai đang xem. */
export interface CardContext {
  viewer: ChatViewer;
  info: CommissionRoomInfo;
  /** messageId của DELIVERABLE_CARD mới nhất trong phòng. */
  latestDeliverableId?: number;
  /** messageId của EXTRA_FEE_CARD (thẻ yêu cầu chỉnh sửa) mới nhất trong phòng. */
  latestRevisionId?: number;
  /** Gọi sau mỗi thao tác: gộp tin trả về (nếu có) và tải lại thông tin commission. */
  onChanged: (messages?: CommissionMessage[]) => void;
}

const isHttpUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);
const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

function formatDateTime(iso?: unknown) {
  if (typeof iso !== "string") return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Một thao tác cần bấm xác nhận lần hai, chống bấm đúp, báo lỗi ngay trong thẻ. */
function useCardAction(onChanged: CardContext["onChanged"]) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function run<T>(action: () => Promise<T>, fallback: string, after?: (result: T) => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      setConfirming(null);
      after?.(result);
    } catch (failure) {
      setError(commissionErrorMessage(failure, fallback));
      onChanged();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { confirming, setConfirming, busy, error, run };
}

const primaryButton = "min-h-11 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-50";
const linkButton = "min-h-11 rounded-lg px-3 text-sm font-semibold underline disabled:opacity-50";

// ---------------------------------------------------------------------------
// DELIVERABLE_CARD — CMS-17 (staff đăng) / CMS-18 (khách chấp nhận)
// ---------------------------------------------------------------------------

export function DeliverableCard({ message, ctx }: { message: CommissionMessage; ctx: CardContext }) {
  const { viewer, info, latestDeliverableId, onChanged } = ctx;
  const action = useCardAction(onChanged);
  const meta = parseMetadata(message.metadataJson);
  const image = [message.mediaUrl, meta?.imageUrl].find(isHttpUrl);
  const version = asNumber(meta?.versionNumber);
  const autoComplete = formatDateTime(meta?.autoCompleteAt);
  const maxRevisions = asNumber(meta?.maxRevisions);
  const revisions = maxRevisions !== undefined ? `${asNumber(meta?.revisionsUsed) ?? 0}/${maxRevisions}` : null;

  const isLatest = message.messageId === latestDeliverableId;
  const awaitingCustomer = isLatest && info.status === "PREVIEW_DELIVERED";
  const accepted = isLatest && info.status === "COMPLETED";

  return (
    <div className="w-72 max-w-full overflow-hidden rounded-xl border-2 border-[#155e59] bg-white">
      <p className="flex items-center justify-between gap-2 bg-[#155e59] px-3 py-1.5 text-sm font-bold text-white">
        <span>Bản xem trước{version !== undefined ? ` · v${version}` : ""}</span>
        {accepted && <span className="rounded-full bg-white/20 px-2 text-xs font-semibold">Đã chấp nhận</span>}
        {!isLatest && <span className="rounded-full bg-white/20 px-2 text-xs font-semibold">Bản cũ</span>}
      </p>
      {image && (
        <a href={image} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Bản xem trước${version !== undefined ? ` v${version}` : ""}`} loading="lazy" decoding="async"
            className="h-60 w-full bg-black object-contain [image-rendering:pixelated]" />
        </a>
      )}
      {message.content && <p className="whitespace-pre-wrap break-words px-3 py-2 text-sm">{message.content}</p>}
      {(revisions || (awaitingCustomer && autoComplete)) && (
        <dl className="space-y-0.5 border-t border-[#cfe3d0] px-3 py-2 text-xs text-[#526159]">
          {revisions && <div className="flex justify-between gap-2"><dt>Lượt chỉnh sửa đã dùng</dt><dd className="font-semibold">{revisions}</dd></div>}
          {awaitingCustomer && autoComplete && <div className="flex justify-between gap-2"><dt>Tự hoàn thành lúc</dt><dd className="font-semibold">{autoComplete}</dd></div>}
        </dl>
      )}

      {awaitingCustomer && viewer === "CUSTOMER" && (
        <div className="space-y-2 border-t border-[#cfe3d0] px-3 py-3">
          {action.error && <p role="alert" className="text-sm text-red-700">{action.error}</p>}
          {action.confirming === "approve" ? (
            <>
              <p className="text-sm">Chấp nhận bản này sẽ <strong>hoàn tất commission</strong> và không thể yêu cầu chỉnh sửa thêm.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={action.busy} className={`${primaryButton} bg-[#155e59] hover:bg-[#0e4b47]`}
                  onClick={() => void action.run(() => approveDeliverableCard(info.commissionId), "Không chấp nhận được bản xem trước.",
                    ({ data }) => onChanged(data?.systemMessage ? [data.systemMessage] : undefined))}>
                  {action.busy ? "Đang xử lý…" : "Xác nhận hoàn tất"}
                </button>
                <button type="button" disabled={action.busy} className={`${linkButton} text-[#155e59]`} onClick={() => action.setConfirming(null)}>Hủy</button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className={`${primaryButton} w-full bg-[#155e59] hover:bg-[#0e4b47]`} onClick={() => action.setConfirming("approve")}>
                Chấp nhận bản này
              </button>
              <p className="text-xs text-[#526159]">Cần chỉnh sửa? Nhắn mô tả cho nhân viên, họ sẽ gửi thẻ yêu cầu chỉnh sửa để bạn xác nhận.</p>
            </>
          )}
        </div>
      )}
      {awaitingCustomer && viewer === "STAFF" && (
        <p className="border-t border-[#cfe3d0] px-3 py-2 text-xs text-[#526159]">Đang chờ khách chấp nhận hoặc yêu cầu chỉnh sửa.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EXTRA_FEE_CARD — thẻ yêu cầu chỉnh sửa: CMS-19 (staff đăng), CMS-20 (khách xác nhận),
// CMS-21 (thanh toán xong → PAID), CMS-22 (khách hủy thanh toán → về PENDING)
// ---------------------------------------------------------------------------

export function RevisionCard({ message, ctx }: { message: CommissionMessage; ctx: CardContext }) {
  const { viewer, info, latestDeliverableId, latestRevisionId, onChanged } = ctx;
  const router = useRouter();
  const action = useCardAction(onChanged);
  const meta = parseMetadata(message.metadataJson);

  const brief = typeof meta?.brief === "string" && meta.brief ? meta.brief : message.content;
  const usesFreeQuota = meta?.usesFreeQuota === true;
  const fee = asNumber(meta?.revisionFee) ?? 0;
  const maxRevisions = asNumber(meta?.maxRevisions);
  const revisionsUsed = asNumber(meta?.revisionsUsed) ?? 0;
  const cardStatus = typeof meta?.status === "string" ? meta.status : "PENDING";
  const wasCancelled = typeof meta?.cancelledPaymentCode === "string";

  // Chỉ thẻ mới nhất, đăng sau bản xem trước mới nhất, mới còn xác nhận/hủy được (giống kiểm tra ở backend).
  const isCurrent = message.messageId === latestRevisionId && (latestDeliverableId ?? 0) < message.messageId;
  const canConfirm = isCurrent && cardStatus === "PENDING" && info.status === "PREVIEW_DELIVERED";
  const awaitingPayment = isCurrent && cardStatus === "CONFIRMED" && !usesFreeQuota && info.status === "AWAITING_EXTRA_PAYMENT";
  const paymentHref = `/commission/${info.commissionId}/payment`;

  const badge = cardStatus === "PAID" ? "Đã thanh toán"
    : cardStatus === "CONFIRMED" ? (usesFreeQuota ? "Đã xác nhận" : awaitingPayment ? "Chờ thanh toán" : "Đã xác nhận")
      : canConfirm ? "Chờ khách xác nhận" : "Hết hiệu lực";

  const feeText = usesFreeQuota
    ? `Miễn phí · dùng 1 lượt${maxRevisions !== undefined ? ` (đã dùng ${revisionsUsed}/${maxRevisions})` : ""}`
    : `${formatPrice(fee)}${typeof meta?.feePercentage === "number" ? ` · ${meta.feePercentage}% giá ban đầu` : ""}`;

  return (
    <div className="w-72 max-w-full overflow-hidden rounded-xl border-2 border-amber-500 bg-amber-50">
      <p className="flex items-center justify-between gap-2 bg-amber-500 px-3 py-1.5 text-sm font-bold text-white">
        <span>Yêu cầu chỉnh sửa</span>
        <span className="rounded-full bg-white/25 px-2 text-xs font-semibold">{badge}</span>
      </p>
      {brief && <p className="whitespace-pre-wrap break-words px-3 py-2 text-sm">{brief}</p>}
      <dl className="border-t border-amber-200 px-3 py-2 text-xs text-amber-950">
        <div className="flex justify-between gap-2"><dt>Chi phí</dt><dd className="text-right font-semibold">{feeText}</dd></div>
        {wasCancelled && cardStatus === "PENDING" && <p className="mt-1 text-amber-800">Lần thanh toán trước đã bị hủy.</p>}
      </dl>

      {viewer === "CUSTOMER" && (canConfirm || awaitingPayment) && (
        <div className="space-y-2 border-t border-amber-200 px-3 py-3">
          {action.error && <p role="alert" className="text-sm text-red-700">{action.error}</p>}

          {canConfirm && (action.confirming === "confirm" ? (
            <>
              <p className="text-sm">
                {usesFreeQuota
                  ? "Designer sẽ bắt đầu chỉnh sửa theo nội dung trên và dùng 1 lượt chỉnh sửa miễn phí."
                  : `Bạn sẽ được chuyển tới trang thanh toán ${formatPrice(fee)}. Designer bắt đầu sửa sau khi thanh toán xong.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={action.busy} className={`${primaryButton} bg-amber-600 hover:bg-amber-700`}
                  onClick={() => void action.run(() => confirmRevisionCard(info.commissionId, message.messageId), "Không xác nhận được yêu cầu chỉnh sửa.",
                    ({ data }) => {
                      onChanged();
                      if (data?.paymentSession) router.push(paymentHref);
                    })}>
                  {action.busy ? "Đang xử lý…" : "Đồng ý"}
                </button>
                <button type="button" disabled={action.busy} className={`${linkButton} text-amber-900`} onClick={() => action.setConfirming(null)}>Hủy</button>
              </div>
            </>
          ) : (
            <button type="button" className={`${primaryButton} w-full bg-amber-600 hover:bg-amber-700`} onClick={() => action.setConfirming("confirm")}>
              {usesFreeQuota ? "Xác nhận chỉnh sửa (miễn phí)" : `Xác nhận & thanh toán ${formatPrice(fee)}`}
            </button>
          ))}

          {awaitingPayment && (action.confirming === "cancel" ? (
            <>
              <p className="text-sm">Hủy thanh toán sẽ đưa commission về trạng thái chờ bạn phản hồi bản xem trước. Bạn có thể xác nhận lại thẻ này sau.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={action.busy} className={`${primaryButton} bg-red-700 hover:bg-red-800`}
                  onClick={() => void action.run(() => cancelRevisionCheckout(info.commissionId), "Không hủy được thanh toán.", () => onChanged())}>
                  {action.busy ? "Đang hủy…" : "Hủy thanh toán"}
                </button>
                <button type="button" disabled={action.busy} className={`${linkButton} text-amber-900`} onClick={() => action.setConfirming(null)}>Giữ lại</button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={paymentHref} className={`${primaryButton} inline-flex items-center bg-amber-600 hover:bg-amber-700`}>
                Thanh toán {formatPrice(fee)}
              </Link>
              <button type="button" className={`${linkButton} text-amber-900`} onClick={() => action.setConfirming("cancel")}>Hủy yêu cầu</button>
            </div>
          ))}
        </div>
      )}
      {viewer === "STAFF" && canConfirm && (
        <p className="border-t border-amber-200 px-3 py-2 text-xs text-amber-900">Đang chờ khách xác nhận.</p>
      )}
    </div>
  );
}
