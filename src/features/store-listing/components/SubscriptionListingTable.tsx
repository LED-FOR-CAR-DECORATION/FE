"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Crown,
  Edit,
  EyeOff,
  Infinity as InfinityIcon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  fetchManagedSubscriptions,
  formatSubscriptionApiError,
  type ManagedSubscriptionPlan,
} from "@/lib/api/subscriptions";
import { formatVnd } from "../format";

interface SubscriptionListingTableProps {
  canManage?: boolean;
  refreshTrigger?: number;
  onCreate?: () => void;
  onEdit?: (plan: ManagedSubscriptionPlan) => void;
  onPublish?: (plan: ManagedSubscriptionPlan) => void;
  onUnlist?: (plan: ManagedSubscriptionPlan) => void;
  onCountChange?: (count: number) => void;
}

type StatusFilter = "ALL" | "UNPUBLISHED" | "PUBLISHED" | "HIDDEN";

function StatusBadge({ status }: { status: string }) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e3f5e9] px-2.5 py-0.5 text-xs font-bold text-[#1d6338]">
        <CheckCircle2 size={12} /> Đang mở bán (PUBLISHED)
      </span>
    );
  }
  if (status === "HIDDEN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
        <EyeOff size={12} /> Đang ẩn (HIDDEN)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
      <Clock size={12} /> Chờ duyệt (UNPUBLISHED)
    </span>
  );
}

export default function SubscriptionListingTable({
  canManage = false,
  refreshTrigger = 0,
  onCreate,
  onEdit,
  onPublish,
  onUnlist,
  onCountChange,
}: SubscriptionListingTableProps) {
  const [plans, setPlans] = useState<ManagedSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

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
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6eadc] bg-[#f4fbf6] px-4 py-3 text-xs text-[#1f432b]">
        <div className="flex items-center gap-2">
          <Crown size={16} className="shrink-0 text-[#2d6a4f]" />
          <span>
            <strong>Quản lý Gói Hội viên (Subscription):</strong> Manager tạo gói mới (mặc định{" "}
            <code className="rounded bg-white px-1 font-mono font-bold">UNPUBLISHED</code>), chỉnh
            sửa giá/thời hạn và bấm <strong>Mở bán</strong> để hiển thị cho khách hàng.
          </span>
        </div>
        {canManage && onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2d6a4f] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1f432b]"
          >
            <Plus size={14} /> Tạo gói hội viên
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên gói, mã planCode, ID..."
            className="w-full rounded-lg border border-[#d8e6dc] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#439660]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "UNPUBLISHED", "PUBLISHED", "HIDDEN"] as StatusFilter[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === st
                  ? "border-[#2d6a4f] bg-[#e9f5ed] text-[#1f432b]"
                  : "border-[#d8e6dc] bg-white text-text-muted hover:bg-gray-50"
              }`}
            >
              {st === "ALL"
                ? "Tất cả"
                : st === "UNPUBLISHED"
                  ? "Chờ duyệt"
                  : st === "PUBLISHED"
                    ? "Đang mở bán"
                    : "Đang ẩn"}
            </button>
          ))}
          <button
            type="button"
            onClick={loadPlans}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d8e6dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f432b] hover:bg-gray-50"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-[#d8e6dc] bg-white p-10 text-center text-sm text-text-muted">
          Đang tải danh sách gói hội viên...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cbe0d1] bg-white p-10 text-center">
          <Crown size={32} className="mx-auto mb-2 text-[#88b998]" />
          <p className="text-sm font-bold text-[#1f432b]">Chưa có gói hội viên nào phù hợp</p>
          <p className="mt-1 text-xs text-text-muted">
            Hãy tạo gói hội viên mới (theo ngày hoặc vĩnh viễn) để mở bán trên cửa hàng.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#d8e6dc] bg-white shadow-xs">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5efe7] bg-[#f7fbf8] text-xs font-bold uppercase tracking-wider text-[#4a6f56]">
                <th className="px-4 py-3">Mã gói / ID</th>
                <th className="px-4 py-3">Tên gói hội viên</th>
                <th className="px-4 py-3">Thời hạn</th>
                <th className="px-4 py-3">Quyền lợi</th>
                <th className="px-4 py-3">Giá bán</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef5f0]">
              {filteredPlans.map((plan) => (
                <tr key={plan.subscriptionDetailId} className="hover:bg-[#f9fcfa]">
                  <td className="px-4 py-3">
                    <span className="inline-block rounded bg-[#1f432b] px-2 py-0.5 font-mono text-xs font-bold text-white">
                      {plan.planCode}
                    </span>
                    <p className="mt-1 text-[11px] text-text-muted">
                      Sub #{plan.subscriptionDetailId} • Product #{plan.productId}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#1f432b]">{plan.planName}</td>
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
                    {canManage && (
                      <div className="inline-flex items-center gap-2">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(plan)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1 text-xs font-bold text-[#1f432b] hover:bg-gray-50"
                          >
                            <Edit size={12} /> Sửa
                          </button>
                        )}
                        {plan.status !== "PUBLISHED" && onPublish && (
                          <button
                            type="button"
                            onClick={() => onPublish(plan)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#2d6a4f] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#1f432b]"
                          >
                            <CheckCircle2 size={12} /> Mở bán
                          </button>
                        )}
                        {plan.status === "PUBLISHED" && onUnlist && (
                          <button
                            type="button"
                            onClick={() => onUnlist(plan)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100"
                          >
                            <EyeOff size={12} /> Ẩn
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

