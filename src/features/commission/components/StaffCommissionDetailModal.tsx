"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Images,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";
import StoreModal from "@/features/store-listing/components/StoreModal";
import { formatPrice } from "@/lib/currency";
import {
  formatCommissionDate,
  getStatusMeta,
  getTierLabel,
  STATUS_TONE_CLASS,
} from "../config/statusMeta";
import { commissionErrorMessage, isRequestCancelled } from "../errors";
import {
  approveCommission,
  getManagementCommission,
  type CommissionManagementDetail,
} from "../services/management-commission.api";
import CommissionMediaManager from "./CommissionMediaManager";
import CommissionReassignment from "./CommissionReassignment";
import CommissionReferenceImages from "./CommissionReferenceImages";
import CommissionRequestRejection from "./CommissionRequestRejection";
import CommissionRevisionTimeline from "./CommissionRevisionTimeline";
import StaffDraftReview from "./StaffDraftReview";

export type StaffDetailModalTab = "OVERVIEW" | "MEDIA";

export interface StaffCommissionDetailModalProps {
  commissionId: number;
  initialTab?: StaffDetailModalTab;
  reloadSignal?: number;
  onClose: () => void;
  onQueueMutated: () => void;
  onOpenAssignDesigner: (detail: CommissionManagementDetail) => void;
}

export default function StaffCommissionDetailModal({
  commissionId,
  initialTab = "OVERVIEW",
  reloadSignal = 0,
  onClose,
  onQueueMutated,
  onOpenAssignDesigner,
}: StaffCommissionDetailModalProps) {
  const [tab, setTab] = useState<StaffDetailModalTab>(initialTab);
  const [detail, setDetail] = useState<CommissionManagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const approvePendingRef = useRef(false);

  const activeReqRef = useRef<{ cancel: () => void } | null>(null);
  const mountedRef = useRef(true);

  const loadDetail = useCallback(() => {
    activeReqRef.current?.cancel();
    setLoading(true);
    setError("");
    const req = getManagementCommission(commissionId);
    activeReqRef.current = req;
    req
      .then(({ data }) => {
        if (!mountedRef.current || activeReqRef.current !== req) return;
        setDetail(data);
      })
      .catch((failure) => {
        if (!mountedRef.current || activeReqRef.current !== req || isRequestCancelled(failure)) {
          return;
        }
        setError(commissionErrorMessage(failure, "Không tải được chi tiết yêu cầu."));
      })
      .finally(() => {
        if (mountedRef.current && activeReqRef.current === req) {
          setLoading(false);
        }
      });
    return req;
  }, [commissionId]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, commissionId]);

  useEffect(() => {
    mountedRef.current = true;
    const req = loadDetail();
    return () => {
      mountedRef.current = false;
      req.cancel();
    };
  }, [loadDetail, reloadSignal]);

  function handleActionSuccess() {
    loadDetail();
    onQueueMutated();
  }

  async function handleApprove() {
    if (!detail || approvePendingRef.current) return;
    approvePendingRef.current = true;
    setActionBusy(true);
    setActionError("");
    try {
      await approveCommission(detail.commissionId);
      handleActionSuccess();
    } catch (failure) {
      setActionError(commissionErrorMessage(failure, "Không duyệt được báo giá yêu cầu."));
    } finally {
      approvePendingRef.current = false;
      setActionBusy(false);
    }
  }

  const statusMeta = getStatusMeta(detail?.status);
  const toneClass = STATUS_TONE_CLASS[statusMeta.tone] ?? STATUS_TONE_CLASS.info;
  const chatAvailable = canReadHistory(detail?.status);
  const hasPendingDraft = Boolean(
    detail?.submissions?.some((sub) => sub.status === "PENDING_STAFF_REVIEW"),
  );
  const staticMediaCount =
    (detail?.submissions?.length ?? 0) + (detail?.attachments?.length ?? 0);

  return (
    <StoreModal
      title={detail ? detail.title : `Chi tiết Commission #${commissionId}`}
      description={
        detail
          ? `${detail.customerName || "Khách hàng"} · Tạo lúc ${formatCommissionDate(detail.createdAt, true)}`
          : "Đang tải thông tin chi tiết…"
      }
      badge={`#${commissionId}`}
      icon={<ClipboardList className="h-5 w-5 text-black" />}
      size="xl"
      busy={actionBusy || lightboxOpen}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {detail && chatAvailable && (
              <Link
                href={`/staff/chat?commissionId=${detail.commissionId}`}
                className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Mở phòng chat
              </Link>
            )}
            {detail?.status === "PAID" && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => onOpenAssignDesigner(detail)}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Phân công họa sĩ
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={actionBusy}
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            Đóng
          </button>
        </div>
      }
    >
      {loading && !detail ? (
        <div role="status" className="border-2 border-dashed border-black/30 p-8 text-center text-sm font-bold text-black/65">
          Đang tải chi tiết commission…
        </div>
      ) : error && !detail ? (
        <div role="alert" className="space-y-3 border-2 border-red-600 bg-red-50 p-4 text-sm font-bold text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadDetail()}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black"
          >
            Thử lại
          </button>
        </div>
      ) : detail ? (
        <div className="space-y-5">
          {/* Status Header + Tabs */}
          <div className="flex flex-col gap-3 border-b-2 border-black pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex border-2 px-2.5 py-1 text-xs font-black uppercase ${toneClass}`}>
                {statusMeta.label}
              </span>
              {detail.isSlaOverdue && (
                <span className="inline-flex items-center gap-1 border-2 border-red-600 bg-red-600 px-2 py-1 text-xs font-black uppercase text-white">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Quá hạn SLA
                </span>
              )}
            </div>

            <div className="flex gap-2" role="tablist" aria-label="Tab chi tiết commission">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "OVERVIEW"}
                onClick={() => setTab("OVERVIEW")}
                className={
                  tab === "OVERVIEW"
                    ? "inline-flex items-center gap-1.5 border-2 border-black bg-primary px-3.5 py-2 text-xs font-black text-black shadow-[2px_2px_0_0_#000]"
                    : "inline-flex items-center gap-1.5 border-2 border-black bg-white px-3.5 py-2 text-xs font-bold text-black hover:bg-neutral-100"
                }
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Thông tin & Xử lý
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "MEDIA"}
                onClick={() => setTab("MEDIA")}
                className={
                  tab === "MEDIA"
                    ? "inline-flex items-center gap-1.5 border-2 border-black bg-primary px-3.5 py-2 text-xs font-black text-black shadow-[2px_2px_0_0_#000]"
                    : "inline-flex items-center gap-1.5 border-2 border-black bg-white px-3.5 py-2 text-xs font-bold text-black hover:bg-neutral-100"
                }
              >
                <Images className="h-3.5 w-3.5" />
                Quản lý ảnh ({staticMediaCount})
              </button>
            </div>
          </div>

          {tab === "MEDIA" ? (
            <CommissionMediaManager
              detail={detail}
              onChanged={handleActionSuccess}
              onLightboxChange={setLightboxOpen}
            />
          ) : (
            <div className="space-y-5">
              {/* Info Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="border-2 border-black bg-[#f7fbf8] p-3 text-xs">
                  <p className="font-black uppercase tracking-wider text-black/60">Khách hàng</p>
                  <p className="mt-1 text-sm font-black text-black">{detail.customerName || "—"}</p>
                  {detail.customerEmail && <p className="text-black/75">{detail.customerEmail}</p>}
                  {detail.customerPhone && <p className="font-mono text-black/75">{detail.customerPhone}</p>}
                </div>

                <div className="border-2 border-black bg-[#f7fbf8] p-3 text-xs">
                  <p className="font-black uppercase tracking-wider text-black/60">Phụ trách</p>
                  <p className="mt-1 font-bold text-black">
                    Họa sĩ:{" "}
                    <span className={detail.assignedDesignerName ? "text-primary-ink" : "text-amber-800"}>
                      {detail.assignedDesignerName || "Chưa phân công"}
                    </span>
                  </p>
                  <p className="mt-0.5 font-semibold text-black/80">
                    Staff: {detail.assignedStaffName || "Chưa gán"}
                  </p>
                </div>

                <div className="border-2 border-black bg-[#f7fbf8] p-3 text-xs">
                  <p className="font-black uppercase tracking-wider text-black/60">Gói & Ngân sách</p>
                  <p className="mt-1 text-sm font-black text-primary-ink">
                    {formatPrice(detail.totalPrice ?? detail.initialPrice ?? 0)}
                  </p>
                  <p className="mt-0.5 font-semibold text-black/80">
                    {getTierLabel(detail.tierCode)} · {detail.targetMatrixDimensions || "Tùy chỉnh"}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-black/70">
                    Lượt sửa: {detail.revisionsUsed ?? 0}/{detail.maxRevisions ?? 0}
                  </p>
                </div>
              </div>

              {/* SLA / Deadlines */}
              {(detail.slaDueAt || detail.quoteExpiresAt || detail.autoCompleteAt) && (
                <div className="flex flex-wrap gap-3 border-2 border-black bg-white px-3 py-2 text-xs">
                  {detail.slaDueAt && (
                    <span>
                      <strong>Hạn SLA:</strong>{" "}
                      <span className={detail.isSlaOverdue ? "font-bold text-red-700" : ""}>
                        {formatCommissionDate(detail.slaDueAt, true)}
                      </span>
                    </span>
                  )}
                  {detail.quoteExpiresAt && (
                    <span>
                      <strong>Hạn thanh toán:</strong> {formatCommissionDate(detail.quoteExpiresAt, true)}
                    </span>
                  )}
                  {detail.autoCompleteAt && (
                    <span>
                      <strong>Tự động hoàn thành:</strong> {formatCommissionDate(detail.autoCompleteAt, true)}
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              <section className="border-2 border-black bg-white p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-black/65">
                  Mô tả yêu cầu
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-black">
                  {detail.description || "Không có mô tả chi tiết."}
                </p>
                {detail.rejectionReason && (
                  <p className="mt-3 border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
                    Lý do từ chối / hủy: {detail.rejectionReason}
                  </p>
                )}
              </section>

              {actionError && (
                <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {actionError}
                </p>
              )}

              {/* Action Block: PENDING_REVIEW */}
              {detail.status === "PENDING_REVIEW" && (
                <section className="space-y-3 border-2 border-black bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase text-black">
                        Duyệt báo giá yêu cầu
                      </h3>
                      <p className="text-xs text-black/75">
                        Xác nhận thông số & giá hợp lệ để chuyển sang trạng thái chờ khách thanh toán.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void handleApprove()}
                      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actionBusy ? "Đang duyệt…" : "Duyệt báo giá"}
                    </button>
                  </div>
                  <CommissionRequestRejection
                    commissionId={detail.commissionId}
                    onChanged={handleActionSuccess}
                  />
                </section>
              )}

              {/* Action Block: PAID -> Assign Designer */}
              {detail.status === "PAID" && (
                <section className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-primary/15 p-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-black">
                      Chờ phân công họa sĩ
                    </h3>
                    <p className="text-xs text-black/75">
                      Khách đã thanh toán. Chọn họa sĩ để bắt đầu thiết kế đơn này.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => onOpenAssignDesigner(detail)}
                    className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black"
                  >
                    <UserCheck className="h-4 w-4" />
                    Phân công họa sĩ
                  </button>
                </section>
              )}

              {/* Action Block: INTERNAL_REVIEW Draft Review */}
              {detail.status === "INTERNAL_REVIEW" && hasPendingDraft && (
                <StaffDraftReview
                  commissionId={detail.commissionId}
                  status={detail.status}
                  drafts={detail.submissions ?? []}
                  onChanged={handleActionSuccess}
                />
              )}

              {/* Revision Timeline */}
              <CommissionRevisionTimeline detail={detail} neo onChanged={handleActionSuccess} />

              {/* Manager Reassignment */}
              <CommissionReassignment detail={detail} onChanged={handleActionSuccess} />

              {/* Customer Reference Attachments Quick Preview */}
              {(detail.attachments?.length ?? 0) > 0 && (
                <div className="space-y-3 border-2 border-black bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-black/70">
                      Xem nhanh ảnh tham khảo ({detail.attachments?.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setTab("MEDIA")}
                      className="text-xs font-black text-primary-ink underline"
                    >
                      Mở quản lý tất cả ảnh →
                    </button>
                  </div>
                  <CommissionReferenceImages
                    items={detail.attachments ?? []}
                    onReload={handleActionSuccess}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </StoreModal>
  );
}
