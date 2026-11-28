"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clock,
  Crown,
  Edit,
  Infinity as InfinityIcon,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  fetchManagedSubscriptions,
  formatSubscriptionApiError,
  type ManagedSubscriptionPlan,
} from "@/lib/api/subscriptions";
import { fetchManagedStoreProducts } from "@/lib/api/products";
import { formatDateTime, formatVnd } from "../format";
import StatusBadge from "./StatusBadge";
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";
import {
  STORE_FORBIDDEN_HINT,
  STORE_TABLE_CLASS,
  STORE_THEAD_CLASS,
  STORE_TH_CLASS,
  StoreActionButton,
  StoreEmptyRow,
  StoreErrorRow,
  StoreHoverActionButton,
  StoreSkeletonRows,
  StoreTablePagination,
  StoreThumbnail,
  storeRowClass,
  useStoreTablePagination,
} from "./StoreTablePrimitives";

interface EnrichedSubscriptionPlan extends ManagedSubscriptionPlan {
  thumbnailUrl?: string;
  updatedAt?: string;
}

interface SubscriptionListingTableProps {
  canManage?: boolean;
  refreshTrigger?: number;
  onCreate?: () => void;
  onEdit?: (plan: ManagedSubscriptionPlan) => void;
  onPublish?: (plan: ManagedSubscriptionPlan) => void;
  onUnlist?: (plan: ManagedSubscriptionPlan) => void;
  onArchive?: (plan: ManagedSubscriptionPlan) => void;
  onDelete?: (plan: ManagedSubscriptionPlan) => void;
  onCountChange?: (count: number) => void;
}

const HEADINGS: { label: string; className?: string }[] = [
  { label: "Mã sản phẩm", className: "w-[108px]" },
  { label: "Ảnh đại diện", className: "w-[88px]" },
  { label: "Tên gói hội viên", className: "w-[210px]" },
  { label: "Thời hạn", className: "w-[120px]" },
  { label: "Quyền lợi" },
  { label: "Giá bán", className: "w-[128px]" },
  { label: "Trạng thái", className: "w-[132px]" },
  { label: "Thao tác", className: "w-[260px] text-right" },
];

export default function SubscriptionListingTable({
  canManage = false,
  refreshTrigger = 0,
  onCreate,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
  onCountChange,
}: SubscriptionListingTableProps) {
  const [plans, setPlans] = useState<EnrichedSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>("ALL");

  const loadPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, productsRes] = await Promise.all([
        fetchManagedSubscriptions(),
        fetchManagedStoreProducts({ productType: "SUBSCRIPTION", size: 200 }).catch(() => ({
          items: [],
          totalElements: 0,
          totalPages: 0,
        })),
      ]);

      const productById = new Map(
        productsRes.items.map((product) => [product.productId, product]),
      );

      const enriched: EnrichedSubscriptionPlan[] = list.map((plan) => {
        const linked = productById.get(plan.productId);
        return {
          ...plan,
          thumbnailUrl: linked?.thumbnailUrl || linked?.galleryUrls?.[0] || undefined,
          updatedAt: linked?.updatedAt ?? linked?.createdAt ?? plan.createdAt,
        };
      });

      setPlans(enriched);
      onCountChange?.(list.length);
    } catch (err) {
      setError(formatSubscriptionApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const statusCounts = useMemo(
    () => computeStatusCounts(plans, (plan) => plan.status),
    [plans],
  );

  const filteredPlans = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return plans.filter((plan) => {
      if (statusFilter !== "ALL" && plan.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        plan.planName.toLowerCase().includes(q) ||
        plan.planCode.toLowerCase().includes(q) ||
        String(plan.productId).includes(q) ||
        String(plan.subscriptionDetailId).includes(q)
      );
    });
  }, [plans, searchTerm, statusFilter]);

  const hasFilters = statusFilter !== "ALL" || searchTerm !== "";
  const {
    page,
    setPage,
    pageSize,
    ready,
    totalPages,
    totalElements,
    pagedItems,
  } = useStoreTablePagination(filteredPlans, `${searchTerm}::${statusFilter}`);

  const resetFilters = () => {
    setStatusFilter("ALL");
    setSearchTerm("");
  };

  const actionTitle = canManage ? undefined : STORE_FORBIDDEN_HINT;

  return (
    <>
      <StoreListingToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={statusCounts}
        isLoading={isLoading}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm kiếm gói hội viên theo tên hoặc mã…"
        onRefresh={loadPlans}
        onReset={resetFilters}
        canReset={hasFilters}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <table className={`${STORE_TABLE_CLASS} min-w-[1180px]`}>
          <caption className="sr-only">
            Danh sách gói hội viên đang quản lý trên cửa hàng
          </caption>
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              {HEADINGS.map((heading) => (
                <th
                  key={heading.label}
                  scope="col"
                  className={`${STORE_TH_CLASS} ${heading.className ?? ""}`}
                >
                  {heading.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(isLoading || !ready) && (
              <StoreSkeletonRows columns={HEADINGS.length} rows={pageSize} />
            )}

            {!isLoading && ready && error && (
              <StoreErrorRow colSpan={HEADINGS.length} message={error} onRetry={loadPlans} />
            )}

            {!isLoading && ready && !error && filteredPlans.length === 0 && (
              <StoreEmptyRow
                colSpan={HEADINGS.length}
                message={
                  plans.length === 0
                    ? "Chưa có gói hội viên nào được niêm yết trên cửa hàng."
                    : "Không tìm thấy gói hội viên phù hợp với bộ lọc."
                }
                hasActiveFilters={plans.length > 0 && hasFilters}
                onResetFilters={resetFilters}
                action={
                  canManage && onCreate ? (
                    <StoreActionButton
                      variant="primary"
                      onClick={onCreate}
                      icon={<Plus size={13} />}
                    >
                      Tạo gói hội viên
                    </StoreActionButton>
                  ) : undefined
                }
              />
            )}

            {!isLoading &&
              ready &&
              !error &&
              pagedItems.map((plan) => {
                const isDeleted = plan.status === "DELETED";
                return (
                  <tr key={plan.subscriptionDetailId} className={storeRowClass(isDeleted)}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{plan.productId}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StoreThumbnail
                        src={plan.thumbnailUrl}
                        alt={`Ảnh đại diện của ${plan.planName}`}
                        fallback={<Crown size={18} aria-hidden="true" />}
                        pixelated
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <p
                        title={plan.planName}
                        className={`truncate text-xs font-black uppercase sm:text-sm ${isDeleted ? "line-through text-text-muted" : "text-black"}`}
                      >
                        {plan.planName}
                      </p>
                      <p className="truncate text-[11px] font-medium text-text-muted tabular-nums">
                        Mã gói: <span className="font-mono font-black text-black">{plan.planCode}</span>
                        {plan.updatedAt ? ` · Cập nhật lúc ${formatDateTime(plan.updatedAt)}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {plan.isLifetime ? (
                        <span className="inline-flex items-center gap-1 border border-black bg-[#e9d5ff] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                          <InfinityIcon size={12} aria-hidden="true" /> Vĩnh viễn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 border border-black bg-[#bae6fd] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] tabular-nums">
                          <Clock size={11} aria-hidden="true" /> {plan.durationDays} ngày
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        {plan.allAccessCharacters && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black">
                            <Sparkles size={13} className="shrink-0 text-primary-ink" aria-hidden="true" /> Mở khóa toàn bộ thư viện nhân vật
                          </span>
                        )}
                        {(plan.maxMobileProfiles ?? 3) > 3 && (
                          <span className="inline-flex w-fit items-center gap-1 border border-black bg-[#e0e7ff] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                            Tối đa {plan.maxMobileProfiles} profile Mobile
                          </span>
                        )}
                        {(plan.maxCommissionRevisions ?? 0) > 0 && (
                          <span className="inline-flex w-fit items-center gap-1 border border-black bg-primary/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                            {plan.maxCommissionRevisions} lượt sửa miễn phí / đơn thiết kế
                          </span>
                        )}
                        {!plan.allAccessCharacters &&
                          (plan.maxMobileProfiles ?? 3) <= 3 &&
                          (plan.maxCommissionRevisions ?? 0) <= 0 && (
                            <span className="text-xs font-medium text-text-muted">Theo cấu hình gói</span>
                          )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm font-black text-primary-ink tabular-nums">
                      {formatVnd(plan.basePrice)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {isDeleted ? null : (
                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                          {onEdit && (
                            <StoreHoverActionButton
                              tone="primary"
                              label="Sửa"
                              aria-label={`Sửa ${plan.planName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Sửa"}
                              onClick={() => onEdit(plan)}
                              icon={<Edit className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {plan.status === "UNPUBLISHED" && onPublish && (
                            <StoreHoverActionButton
                              tone="approve"
                              label="Mở bán"
                              aria-label={`Mở bán ${plan.planName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Mở bán"}
                              onClick={() => onPublish(plan)}
                              icon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {plan.status === "ARCHIVED" && onPublish && (
                            <StoreHoverActionButton
                              tone="approve"
                              labelSize="medium"
                              label="Mở bán lại"
                              aria-label={`Mở bán lại ${plan.planName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Mở bán lại"}
                              onClick={() => onPublish(plan)}
                              icon={<Undo2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {plan.status !== "ARCHIVED" && onArchive && (
                            <StoreHoverActionButton
                              tone="neutral"
                              labelSize="medium"
                              label="Ngừng bán"
                              aria-label={`Ngừng bán ${plan.planName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Ngừng bán"}
                              onClick={() => onArchive(plan)}
                              icon={<Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {onDelete && (
                            <StoreHoverActionButton
                              tone="danger"
                              label="Xóa"
                              aria-label={`Xóa ${plan.planName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Xóa"}
                              onClick={() => onDelete(plan)}
                              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!error && (
        <StoreTablePagination
          page={page}
          size={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          totalUnfilteredCount={plans.length}
          unitLabel="gói hội viên"
          onPageChange={setPage}
          disabled={isLoading || !ready}
          ariaLabel="Phân trang danh sách gói hội viên"
        />
      )}
    </>
  );
}
