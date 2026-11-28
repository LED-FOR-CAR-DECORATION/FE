"use client";

import "@/lib/api/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
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
import Pagination from "@/components/ui/Pagination";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";
import { isRequestCancelled } from "@/features/commission/errors";
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

function useCommissionGridLayout(): {
  columns: 1 | 2;
  rows: number;
  pageSize: number;
  isDesktop: boolean;
  ready: boolean;
} {
  const [layout, setLayout] = useState<{
    columns: 1 | 2;
    rows: number;
    isDesktop: boolean;
    ready: boolean;
  }>({
    columns: 2,
    rows: 2,
    isDesktop: true,
    ready: false,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isDesktop = width >= 1024;
      const columns: 1 | 2 = width >= 768 ? 2 : 1;
      // Header (106px) + main py (24px) + heading (48px) + tabs bar (54px) + pager (52px) + gaps (30px) = ~314px
      const chromeHeight = 314;
      const estimatedRowHeight = 176;
      const rowGap = 12;
      const rows = isDesktop
        ? Math.max(
            1,
            Math.min(
              4,
              Math.floor((Math.max(0, height - chromeHeight) + rowGap) / (estimatedRowHeight + rowGap)),
            ),
          )
        : columns === 2
          ? 2
          : 4;
      setLayout({ columns, rows, isDesktop, ready: true });
    };

    compute();
    const onResize = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return {
    columns: layout.columns,
    rows: layout.rows,
    pageSize: layout.columns * layout.rows,
    isDesktop: layout.isDesktop,
    ready: layout.ready,
  };
}

export default function CommissionRequestList() {
  const { user, isLoading } = useAuth();
  const userId = user?.role === "CUSTOMER" ? user.userId : undefined;

  return (
    <section
      aria-labelledby="commission-list-heading"
      className="flex flex-col gap-2.5 lg:h-full lg:min-h-0"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2.5">
        <div className="flex items-center gap-2.5">
          <Sparkles size={24} className="shrink-0 text-primary-ink" />
          <div>
            <h1 id="commission-list-heading" className="text-xl font-black uppercase tracking-tight sm:text-2xl">
              Yêu cầu thiết kế riêng
            </h1>
            <p className="text-[11px] font-semibold text-text-muted">
              Theo dõi báo giá, thanh toán và trao đổi trực tiếp với họa sĩ thiết kế Pixel Art.
            </p>
          </div>
        </div>
        <Link
          href="/commission/new"
          className="btn-primary inline-flex h-9 items-center gap-1.5 px-3.5! py-0! text-xs font-black uppercase"
        >
          <Plus size={15} />
          Tạo yêu cầu mới
        </Link>
      </div>

      {isLoading ? (
        <div
          aria-busy="true"
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2"
          aria-label="Đang tải danh sách yêu cầu"
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="neo-box-no-hover h-44 animate-pulse bg-gray-100 p-3.5" />
          ))}
        </div>
      ) : userId ? (
        <ServerCommissionRequests key={userId} />
      ) : (
        <div className="neo-box-no-hover flex flex-1 flex-col items-center justify-center bg-white p-8 text-center">
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
  const { rows, pageSize, isDesktop, ready } = useCommissionGridLayout();
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
    : `${activeTab}:${sortDirection}:${page}:${pageSize}:${retryCount}`;

  useEffect(() => {
    if (!ready) return;
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
      size: isGroupedTab ? 100 : pageSize,
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
        if (!active || isRequestCancelled(error)) return;
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
  }, [activeTab, isGroupedTab, page, pageSize, ready, requestKey, retryCount, sortDirection]);

  const currentData = result?.key === requestKey ? result : undefined;
  const tabSortPrefix = `${activeTab}:${sortDirection}:`;
  const activeMetaSource = currentData ?? (result?.key.startsWith(tabSortPrefix) ? result : undefined);

  const visibleItems = useMemo(() => {
    if (!currentData) return undefined;
    if (!currentData.isClientSliced) return currentData.items;
    return currentData.items.slice(page * pageSize, (page + 1) * pageSize);
  }, [currentData, page, pageSize]);

  const totalElements = activeMetaSource?.totalElements;
  const derivedTotalPages = useMemo(() => {
    if (!activeMetaSource) return undefined;
    if (activeMetaSource.isClientSliced) {
      return Math.max(1, Math.ceil(activeMetaSource.items.length / pageSize));
    }
    if (activeMetaSource.totalPages !== undefined) {
      return Math.max(1, activeMetaSource.totalPages);
    }
    return Math.max(1, activeMetaSource.hasNext ? page + 2 : page + 1);
  }, [activeMetaSource, page, pageSize]);

  // Clamp out-of-range page when resize increases pageSize and shrinks totalPages
  useEffect(() => {
    if (!currentData || derivedTotalPages === undefined) return;
    if (page >= derivedTotalPages) {
      setPage(Math.max(0, derivedTotalPages - 1));
    }
  }, [currentData, derivedTotalPages, page]);

  const handleTabChange = (nextTab: TabKey) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    setPage(0);
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "DESC" ? "ASC" : "DESC"));
    setPage(0);
  };

  const isEmpty = visibleItems !== undefined && visibleItems.length === 0;
  const totalPages = derivedTotalPages ?? Math.max(1, page + 1);
  const currentOneBasedPage = Math.min(page + 1, totalPages);

  return (
    <div className="flex flex-1 flex-col gap-2.5 lg:min-h-0">
      {/* Status Tabs & Sort Bar */}
      <div className="neo-box-no-hover flex shrink-0 flex-col gap-2 bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Lọc theo trạng thái Commission" className="flex flex-wrap gap-1.5">
          {COMMISSION_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={`h-9 cursor-pointer border-2 border-black px-2.5 text-[11px] uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
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
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 border-2 border-black bg-white px-2.5 text-[11px] font-bold uppercase text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <ArrowDownUp size={13} />
          {sortDirection === "DESC" ? "Mới nhất" : "Cũ nhất"}
        </button>
      </div>

      {/* Main Content */}
      {failedKey === requestKey ? (
        <div role="alert" className="neo-box-no-hover flex flex-1 flex-col justify-center space-y-3 border-l-8 border-l-red-600 bg-white p-6">
          <div className="flex items-start gap-2 text-sm font-bold text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>Không tải được danh sách yêu cầu thiết kế riêng. Vui lòng thử lại.</p>
          </div>
          {errorTraceId && (
            <p className="break-all text-xs font-semibold text-text-muted">Mã hỗ trợ: {errorTraceId}</p>
          )}
          <div>
            <button
              type="button"
              onClick={() => {
                setFailedKey(undefined);
                setResult(undefined);
                setRetryCount((count) => count + 1);
              }}
              className="btn-secondary min-h-10 text-xs font-black uppercase"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : !ready || !visibleItems ? (
        <div
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2"
          style={isDesktop ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}
          role="status"
          aria-busy="true"
          aria-label="Đang tải yêu cầu Commission"
        >
          <span className="sr-only">Đang tải danh sách yêu cầu thiết kế riêng...</span>
          {Array.from({ length: ready ? pageSize : 4 }).map((_, idx) => (
            <div key={idx} aria-hidden="true" className="neo-box-no-hover h-full min-h-[160px] animate-pulse bg-gray-100 p-3" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="neo-box-no-hover flex flex-1 flex-col items-center justify-center bg-white p-10 text-center">
          <Sparkles size={40} className="mx-auto mb-3 text-primary-ink" />
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
                className="btn-secondary min-h-10 text-xs font-black uppercase"
              >
                Xem tất cả yêu cầu
              </button>
            )}
            <Link
              href="/commission/new"
              className="btn-primary inline-flex min-h-10 items-center gap-1.5 text-xs font-black uppercase"
            >
              <Plus size={15} />
              Tạo yêu cầu mới
            </Link>
          </div>
        </div>
      ) : (
        <ul
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2"
          style={
            isDesktop && visibleItems.length > 0
              ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {visibleItems.map((item) => {
            const statusMeta = getStatusMeta(item.status);
            const paymentPending = isPaymentPendingStatus(item.status);
            const chatReadable = canReadHistory(item.status);

            return (
              <li key={item.commissionId} className="h-full min-h-0">
                <article className="neo-box-no-hover flex h-full min-h-0 flex-col justify-between bg-white p-3">
                  {/* Header Strip */}
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-black pb-1.5">
                    <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                      <span className="shrink-0 border border-black bg-gray-100 px-1.5 py-0.5 font-black tabular-nums">
                        #{item.commissionId}
                      </span>
                      <span className="shrink-0 border border-black bg-white px-1.5 py-0.5 text-[10px] font-black uppercase">
                        {getTierLabel(item.tierCode)}
                      </span>
                      {item.createdAt && (
                        <span className="truncate font-semibold text-text-muted">
                          {formatCommissionDate(item.createdAt)}
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 border-2 px-2 py-0.5 text-[10px] font-black uppercase ${
                        STATUS_TONE_CLASS[statusMeta.tone]
                      }`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex min-h-0 flex-1 items-center justify-between gap-3 py-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2
                        title={item.title}
                        className="line-clamp-1 text-sm font-black uppercase tracking-tight text-text-main"
                      >
                        {item.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-text-muted">
                        {item.targetMatrixDimensions && (
                          <span className="inline-flex items-center gap-1">
                            <Grid size={12} className="text-primary-ink" />
                            LED {item.targetMatrixDimensions}
                          </span>
                        )}
                        {item.maxRevisions !== undefined && (
                          <span className="inline-flex items-center gap-1">
                            <RefreshCw size={12} className="text-primary-ink" />
                            {item.revisionsUsed ?? 0}/{item.maxRevisions} lượt sửa
                          </span>
                        )}
                        {paymentPending && item.quoteExpiresAt && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                            <Clock size={12} />
                            Hạn TT: {formatCommissionDate(item.quoteExpiresAt, true)}
                          </span>
                        )}
                      </div>

                      <p title={statusMeta.helper} className="line-clamp-1 text-[11px] font-medium text-text-muted">
                        {statusMeta.helper}
                      </p>
                    </div>

                    {item.totalPrice !== undefined && (
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase text-text-muted">Tổng chi phí</p>
                        <p className="text-base font-black tabular-nums text-primary-ink">
                          {formatPrice(item.totalPrice)}
                        </p>
                        {(item.extraRevisionFee ?? 0) > 0 && (
                          <p className="text-[10px] font-semibold text-text-muted">
                            (Phí sửa {formatPrice(item.extraRevisionFee!)})
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="flex shrink-0 items-center justify-end gap-2 border-t-2 border-dashed border-black pt-2">
                    {item.commissionId !== undefined && (
                      <button
                        type="button"
                        onClick={() => setSelectedDetailId(item.commissionId!)}
                        className="btn-secondary inline-flex h-8 items-center gap-1.5 px-3! py-0! text-[11px] font-black uppercase"
                      >
                        <Eye size={13} />
                        Xem chi tiết
                      </button>
                    )}

                    {paymentPending && item.commissionId !== undefined && (
                      <Link
                        href={`/commission/${item.commissionId}/payment`}
                        className="btn-primary inline-flex h-8 items-center gap-1.5 px-3! py-0! text-[11px] font-black uppercase"
                      >
                        <QrCode size={13} />
                        Thanh toán ngay
                        <span className="sr-only"> cho {item.title}</span>
                      </Link>
                    )}

                    {!paymentPending && chatReadable && item.commissionId !== undefined && (
                      <Link
                        href={`/messages?commissionId=${item.commissionId}`}
                        className="btn-primary inline-flex h-8 items-center gap-1.5 px-3! py-0! text-[11px] font-black uppercase"
                      >
                        <MessageSquare size={13} />
                        {item.status === "COMPLETED" ? "Xem trao đổi" : "Mở trao đổi"}
                        <span className="sr-only"> cho {item.title}</span>
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {/* Bottom-Pinned Pagination Bar */}
      {!isEmpty && failedKey !== requestKey && (
        <Pagination
          page={currentOneBasedPage}
          totalPages={totalPages}
          onPageChange={(nextPage) => setPage(nextPage - 1)}
          totalItems={totalElements}
          pageSize={pageSize}
          itemLabel="yêu cầu"
          ariaLabel="Phân trang yêu cầu Commission"
          variant="neo"
          alwaysShow
          className="mt-auto shrink-0 py-2!"
        />
      )}

      {/* Detail Modal */}
      <CommissionDetailDialog
        commissionId={selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
      />
    </div>
  );
}
