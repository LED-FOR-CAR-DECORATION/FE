"use client";

import "@/lib/api/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Grid,
  MessageSquare,
  Plus,
  QrCode,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import { CustomerCommissionFilterRequest } from "@/api_client/models/CustomerCommissionFilterRequest";
import type { CustomerCommissionSummaryItem } from "@/api_client/models/CustomerCommissionSummaryItem";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";
import { formatPrice } from "@/lib/currency";
import CommissionDetailDialog from "./CommissionDetailDialog";
import {
  STATUS_TONE_CLASS,
  formatCommissionDate,
  getStatusMeta,
  getTierLabel,
  isPaymentPendingStatus,
} from "../config/statusMeta";

type TabKey = "ALL" | "PENDING_REVIEW" | "PAYMENT" | "DESIGNING" | "COMPLETED" | "CANCELLED";

const PAGE_SIZE = 10;

const COMMISSION_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "PAYMENT", label: "Chờ thanh toán" },
  { key: "DESIGNING", label: "Đang thiết kế" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const PAYMENT_STATUSES = new Set<string>(["PENDING_PAYMENT", "AWAITING_EXTRA_PAYMENT"]);
const DESIGNING_STATUSES = new Set<string>([
  "PAID",
  "IN_PROGRESS",
  "INTERNAL_REVIEW",
  "INTERNAL_REVISION_REQUIRED",
  "PREVIEW_DELIVERED",
  "CUSTOMER_REVISION_REQUESTED",
  "AWAITING_ESTIMATE",
]);
const CANCELLED_STATUSES = new Set<string>(["CANCELLED", "EXPIRED"]);

function matchesGroupedTab(tab: TabKey, status?: string): boolean {
  if (!status) return false;
  if (tab === "PAYMENT") return PAYMENT_STATUSES.has(status);
  if (tab === "DESIGNING") return DESIGNING_STATUSES.has(status);
  if (tab === "CANCELLED") return CANCELLED_STATUSES.has(status);
  return true;
}

function getPaginationMetaNumbers(rawMeta: unknown): {
  totalElements?: number;
  totalPages?: number;
  hasNext?: boolean;
} {
  if (!rawMeta || typeof rawMeta !== "object") return {};
  const meta = rawMeta as Record<string, unknown>;
  return {
    totalElements: typeof meta.totalElements === "number" ? meta.totalElements : undefined,
    totalPages: typeof meta.totalPages === "number" ? meta.totalPages : undefined,
    hasNext: typeof meta.hasNext === "boolean" ? meta.hasNext : undefined,
  };
}

function buildPageWindow(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set<number>([0, totalPages - 1, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

export default function CommissionRequestList() {
  const { user, isLoading } = useAuth();
  const userId = user?.role === "CUSTOMER" ? user.userId : undefined;

  return (
    <section aria-labelledby="commission-list-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <Sparkles size={28} className="shrink-0 text-primary-ink" />
          <div>
            <h1 id="commission-list-heading" className="text-3xl font-black uppercase tracking-tight">
              Yêu cầu thiết kế riêng
            </h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              Theo dõi báo giá, thanh toán và trao đổi trực tiếp với họa sĩ thiết kế Pixel Art.
            </p>
          </div>
        </div>
        <Link
          href="/commission/new"
          className="btn-primary inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
        >
          <Plus size={16} />
          Tạo yêu cầu mới
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-label="Đang tải danh sách yêu cầu">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="neo-box-no-hover h-36 animate-pulse bg-gray-100 p-5" />
          ))}
        </div>
      ) : userId ? (
        <ServerCommissionRequests key={userId} />
      ) : (
        <div className="neo-box-no-hover bg-white p-8 text-center">
          <p className="text-sm font-bold text-text-main">
            Đăng nhập bằng tài khoản khách hàng để xem các yêu cầu thiết kế riêng của bạn.
          </p>
          <Link href="/login?returnUrl=/commission" className="btn-primary mt-4 inline-flex min-h-11 items-center text-xs font-black uppercase">
            Đăng nhập ngay
          </Link>
        </div>
      )}
    </section>
  );
}

interface FetchState {
  key: string;
  items: CustomerCommissionSummaryItem[];
  totalElements?: number;
  totalPages?: number;
  hasNext?: boolean;
  isClientSliced: boolean;
}

function ServerCommissionRequests() {
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [sortDirection, setSortDirection] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<FetchState>();
  const [failedKey, setFailedKey] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [errorTraceId, setErrorTraceId] = useState<string>();
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);

  const isGroupedTab = activeTab === "PAYMENT" || activeTab === "DESIGNING" || activeTab === "CANCELLED";
  const requestKey = isGroupedTab
    ? `${activeTab}:${sortDirection}:${retryCount}`
    : `${activeTab}:${sortDirection}:${page}:${retryCount}`;

  useEffect(() => {
    setFailedKey(undefined);
    setErrorTraceId(undefined);
    let active = true;

    const singleStatus =
      activeTab === "PENDING_REVIEW"
        ? CustomerCommissionFilterRequest.status.PENDING_REVIEW
        : activeTab === "COMPLETED"
          ? CustomerCommissionFilterRequest.status.COMPLETED
          : undefined;

    const request = CustomerCommissionsService.listMyCommissions({
      ...(singleStatus ? { status: singleStatus } : {}),
      sortDirection,
      page: isGroupedTab ? 0 : page,
      size: isGroupedTab ? 100 : PAGE_SIZE,
    });

    request
      .then((response) => {
        if (!active) return;
        const rawItems = response.data ?? [];
        if (isGroupedTab) {
          const filtered = rawItems.filter((item) => matchesGroupedTab(activeTab, item.status));
          setResult({
            key: requestKey,
            items: filtered,
            totalElements: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
            isClientSliced: true,
          });
        } else {
          const meta = getPaginationMetaNumbers(response.meta);
          setResult({
            key: requestKey,
            items: rawItems,
            totalElements: meta.totalElements,
            totalPages: meta.totalPages,
            hasNext: meta.hasNext,
            isClientSliced: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFailedKey(requestKey);
        if (error && typeof error === "object" && "body" in error) {
          const body = error.body;
          if (body && typeof body === "object" && "traceId" in body && typeof body.traceId === "string") {
            setErrorTraceId(body.traceId);
          }
        }
      });

    return () => {
      active = false;
      request.cancel();
    };
  }, [activeTab, isGroupedTab, page, requestKey, retryCount, sortDirection]);

  const currentData = result?.key === requestKey ? result : undefined;

  const visibleItems = useMemo(() => {
    if (!currentData) return undefined;
    if (!currentData.isClientSliced) return currentData.items;
    return currentData.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [currentData, page]);

  const totalElements = currentData?.totalElements;
  const totalPages = currentData?.totalPages ?? (currentData ? (currentData.hasNext ? page + 2 : Math.max(1, page + 1)) : 1);
  const canGoNext = currentData
    ? currentData.isClientSliced
      ? (page + 1) * PAGE_SIZE < currentData.items.length
      : currentData.hasNext ?? (currentData.totalPages !== undefined ? page + 1 < currentData.totalPages : currentData.items.length === PAGE_SIZE)
    : false;

  const handleTabChange = (nextTab: TabKey) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    setPage(0);
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "DESC" ? "ASC" : "DESC"));
    setPage(0);
  };

  const rangeStart = visibleItems && visibleItems.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const rangeEnd = visibleItems ? page * PAGE_SIZE + visibleItems.length : 0;
  const pageWindow = buildPageWindow(page, totalPages);

  return (
    <div className="space-y-5">
      {/* Status Tabs & Sort Bar */}
      <div className="neo-box-no-hover flex flex-col gap-3 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Lọc theo trạng thái Commission" className="flex flex-wrap gap-2">
          {COMMISSION_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={`min-h-11 cursor-pointer border-2 border-black px-3 py-1.5 text-xs uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  isActive
                    ? "bg-primary font-black text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-white font-bold text-black hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleSort}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <ArrowDownUp size={14} />
          {sortDirection === "DESC" ? "Mới nhất" : "Cũ nhất"}
        </button>
      </div>

      {/* Main Content */}
      {failedKey === requestKey ? (
        <div role="alert" className="neo-box-no-hover space-y-3 border-l-8 border-l-red-600 bg-white p-5">
          <div className="flex items-start gap-2 text-sm font-bold text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>Không tải được danh sách yêu cầu thiết kế riêng. Vui lòng thử lại.</p>
          </div>
          {errorTraceId && (
            <p className="break-all text-xs font-semibold text-text-muted">Mã hỗ trợ: {errorTraceId}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setFailedKey(undefined);
              setResult(undefined);
              setRetryCount((count) => count + 1);
            }}
            className="btn-secondary min-h-11 text-xs font-black uppercase"
          >
            Thử lại
          </button>
        </div>
      ) : !visibleItems ? (
        <div className="space-y-4" role="status" aria-label="Đang tải yêu cầu Commission">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="neo-box-no-hover h-40 animate-pulse bg-gray-100 p-5" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="neo-box-no-hover bg-white p-12 text-center">
          <Sparkles size={42} className="mx-auto mb-3 text-primary-ink" />
          <p className="text-base font-black uppercase text-black">
            {activeTab === "ALL"
              ? "Bạn chưa có yêu cầu thiết kế riêng nào"
              : "Không có yêu cầu nào ở trạng thái này"}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {activeTab === "ALL"
              ? "Đặt vẽ Pixel Art theo ý tưởng riêng để hiển thị trên thiết bị LED của bạn."
              : "Thử chuyển sang trạng thái khác hoặc tạo một yêu cầu thiết kế mới."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {activeTab !== "ALL" && (
              <button
                type="button"
                onClick={() => handleTabChange("ALL")}
                className="btn-secondary min-h-11 text-xs font-black uppercase"
              >
                Xem tất cả yêu cầu
              </button>
            )}
            <Link
              href="/commission/new"
              className="btn-primary inline-flex min-h-11 items-center gap-1.5 text-xs font-black uppercase"
            >
              <Plus size={15} />
              Tạo yêu cầu mới
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((item) => {
            const statusMeta = getStatusMeta(item.status);
            const paymentPending = isPaymentPendingStatus(item.status);
            const chatReadable = canReadHistory(item.status);

            return (
              <li key={item.commissionId} className="neo-box-no-hover bg-white p-5">
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="border border-black bg-gray-100 px-2 py-0.5 font-black tabular-nums">
                      #{item.commissionId}
                    </span>
                    <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase">
                      {getTierLabel(item.tierCode)}
                    </span>
                    {item.createdAt && (
                      <span className="font-semibold text-text-muted">
                        Gửi ngày {formatCommissionDate(item.createdAt)}
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 border-2 px-2.5 py-0.5 text-xs font-black uppercase ${
                      STATUS_TONE_CLASS[statusMeta.tone]
                    }`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="break-words text-lg font-black uppercase tracking-tight text-text-main">
                      {item.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-text-muted">
                      {item.targetMatrixDimensions && (
                        <span className="inline-flex items-center gap-1">
                          <Grid size={14} className="text-primary-ink" />
                          LED {item.targetMatrixDimensions}
                        </span>
                      )}
                      {item.maxRevisions !== undefined && (
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw size={14} className="text-primary-ink" />
                          {item.revisionsUsed ?? 0}/{item.maxRevisions} lượt sửa miễn phí
                        </span>
                      )}
                      {paymentPending && item.quoteExpiresAt && (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                          <Clock size={14} />
                          Hạn TT: {formatCommissionDate(item.quoteExpiresAt, true)}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.totalPrice !== undefined && (
                    <div className="shrink-0 sm:text-right">
                      <p className="text-xs font-bold uppercase text-text-muted">Tổng chi phí</p>
                      <p className="text-xl font-black tabular-nums text-primary-ink">
                        {formatPrice(item.totalPrice)}
                      </p>
                      {(item.extraRevisionFee ?? 0) > 0 && (
                        <p className="text-xs font-semibold text-text-muted">
                          (Gồm phí sửa {formatPrice(item.extraRevisionFee!)})
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-black pt-3">
                  <p className="min-w-0 flex-1 text-xs font-medium text-text-muted">
                    {statusMeta.helper}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {item.commissionId !== undefined && (
                      <button
                        type="button"
                        onClick={() => setSelectedDetailId(item.commissionId!)}
                        className="btn-secondary inline-flex min-h-11 items-center gap-1.5 text-xs font-black uppercase"
                      >
                        <Eye size={15} />
                        Xem chi tiết
                      </button>
                    )}

                    {paymentPending && item.commissionId !== undefined && (
                      <Link
                        href={`/commission/${item.commissionId}/payment`}
                        className="btn-primary inline-flex min-h-11 items-center gap-1.5 text-xs font-black uppercase"
                      >
                        <QrCode size={15} />
                        Thanh toán ngay
                        <span className="sr-only"> cho {item.title}</span>
                      </Link>
                    )}

                    {!paymentPending && chatReadable && item.commissionId !== undefined && (
                      <Link
                        href={`/messages?commissionId=${item.commissionId}`}
                        className="btn-primary inline-flex min-h-11 items-center gap-1.5 text-xs font-black uppercase"
                      >
                        <MessageSquare size={15} />
                        {item.status === "COMPLETED" ? "Xem trao đổi" : "Mở trao đổi"}
                        <span className="sr-only"> cho {item.title}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination Bar */}
      {visibleItems && visibleItems.length > 0 && (totalPages > 1 || page > 0 || canGoNext) && (
        <nav
          aria-label="Phân trang yêu cầu Commission"
          className="neo-box-no-hover flex flex-wrap items-center justify-between gap-3 bg-white p-4"
        >
          <p className="text-xs font-bold uppercase text-text-muted">
            {totalElements !== undefined
              ? `Hiển thị ${rangeStart} - ${rangeEnd} / ${totalElements} yêu cầu`
              : `Trang ${page + 1}`}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="grid min-h-11 min-w-11 cursor-pointer place-items-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>

            {pageWindow.map((entry, idx) =>
              entry === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs font-black text-text-muted">
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setPage(entry)}
                  aria-current={page === entry ? "page" : undefined}
                  aria-label={`Trang ${entry + 1}`}
                  className={`min-h-11 min-w-11 cursor-pointer border-2 border-black px-3 text-xs font-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 ${
                    page === entry ? "bg-primary text-black" : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  {entry + 1}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setPage((p) => p + 1)}
              className="grid min-h-11 min-w-11 cursor-pointer place-items-center border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}

      {/* Detail Modal */}
      <CommissionDetailDialog
        commissionId={selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
      />
    </div>
  );
}
