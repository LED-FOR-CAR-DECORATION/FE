"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clock,
  Crown,
  Edit,
  EyeOff,
  Infinity as InfinityIcon,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  fetchManagedSubscriptions,
  formatSubscriptionApiError,
  type ManagedSubscriptionPlan,
} from "@/lib/api/subscriptions";
import { formatVnd } from "../format";
import StatusBadge from "./StatusBadge";
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";

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

export default function SubscriptionListingTable({
  canManage = false,
  refreshTrigger = 0,
  onCreate,
  onEdit,
  onPublish,
  onUnlist,
  onArchive,
  onDelete,
  onCountChange,
}: SubscriptionListingTableProps) {
  const [plans, setPlans] = useState<ManagedSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>("ALL");

  const loadPlans = () => {
    setIsLoading(true);
    setError(null);
    fetchManagedSubscriptions()
      .then((list) => {
        setPlans(list);
        onCountChange?.(list.length);
      })
      .catch((err) => {
        setError(formatSubscriptionApiError(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadPlans();
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

  return (
    <div className="flex flex-col">
      <StoreListingToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={statusCounts}
        isLoading={isLoading}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo tên gói, mã gói, ID…"
        onRefresh={loadPlans}
        onReset={() => {
          setStatusFilter("ALL");
          setSearchTerm("");
        }}
        canReset={statusFilter !== "ALL" || searchTerm !== ""}
        rightAction={
          canManage &&
          onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2d6a4f] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1f432b]"
            >
              <Plus size={14} /> Tạo gói hội viên
            </button>
          )
        }
      />

      {/* Table */}
      {error ? (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">
          Đang tải danh sách gói hội viên...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="m-4 rounded-xl border border-dashed border-[#cbe0d1] bg-white p-10 text-center">
          <Crown size={32} className="mx-auto mb-2 text-[#88b998]" />
          <p className="text-sm font-bold text-[#1f432b]">Chưa có gói hội viên nào phù hợp</p>
          <p className="mt-1 text-xs text-text-muted">
            Hãy tạo gói hội viên mới (theo ngày hoặc vĩnh viễn) để mở bán trên cửa hàng.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="border-b border-[#e3efe6]">
              <tr className="text-[11px] font-black uppercase tracking-wide">
                <th className="whitespace-nowrap px-4 py-3">Mã sản phẩm</th>
                <th className="whitespace-nowrap px-4 py-3">Tên gói hội viên</th>
                <th className="whitespace-nowrap px-4 py-3">Thời hạn</th>
                <th className="whitespace-nowrap px-4 py-3">Quyền lợi</th>
                <th className="whitespace-nowrap px-4 py-3">Giá bán</th>
                <th className="whitespace-nowrap px-4 py-3">Trạng thái</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef5f0]">
              {filteredPlans.map((plan) => {
                const isDeleted = plan.status === "DELETED";
                return (
                  <tr
                    key={plan.subscriptionDetailId}
                    className={isDeleted ? "bg-neutral-100/60 opacity-45 grayscale" : "hover:bg-[#f9fcfa]"}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-black text-primary-dark">
                      #{plan.productId}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-bold text-[#1f432b] ${isDeleted ? "line-through text-neutral-500" : ""}`}>
                        {plan.planName}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] font-medium text-text-muted">
                        Mã gói: {plan.planCode}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {plan.isLifetime ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                          <InfinityIcon size={13} /> Vĩnh viễn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                          <Clock size={12} /> {plan.durationDays} ngày
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {plan.allAccessCharacters ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d6a4f]">
                          <Sparkles size={13} /> Mở khóa toàn bộ Character
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">Theo cấu hình gói</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-[#1f432b]">
                      {formatVnd(plan.basePrice)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && !isDeleted && (
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(plan)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1 text-xs font-bold text-[#1f432b] hover:bg-gray-50"
                            >
                              <Edit size={12} /> Sửa
                            </button>
                          )}
                          {(plan.status === "UNPUBLISHED" || plan.status === "ARCHIVED") && onPublish && (
                            <button
                              type="button"
                              onClick={() => onPublish(plan)}
                              className="inline-flex items-center gap-1 rounded-md bg-[#2d6a4f] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#1f432b]"
                            >
                              <CheckCircle2 size={12} /> {plan.status === "ARCHIVED" ? "Mở bán lại" : "Mở bán"}
                            </button>
                          )}
                          {plan.status !== "ARCHIVED" && onArchive && (
                            <button
                              type="button"
                              onClick={() => onArchive(plan)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#cfe0d4] bg-white px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              <Archive size={12} /> Ngừng bán
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(plan)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
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
      )}
    </div>
  );
}
