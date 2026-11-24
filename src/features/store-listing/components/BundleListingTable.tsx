"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Boxes,
  CheckCircle2,
  Edit,
  EyeOff,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { fetchManagedBundles, type ManagedBundleItem } from "@/lib/api/bundles";
import { formatVnd } from "../format";
import StatusBadge from "./StatusBadge";
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";

interface BundleListingTableProps {
  canManage?: boolean;
  onEdit?: (bundle: ManagedBundleItem) => void;
  onPublish?: (bundle: ManagedBundleItem) => void;
  onUnlist?: (bundle: ManagedBundleItem) => void;
  onDelete?: (bundle: ManagedBundleItem) => void;
  onCreate?: () => void;
  refreshTrigger?: number;
}

export default function BundleListingTable({
  canManage = false,
  onEdit,
  onPublish,
  onUnlist,
  onDelete,
  onCreate,
  refreshTrigger = 0,
}: BundleListingTableProps) {
  const [bundles, setBundles] = useState<ManagedBundleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadBundles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchManagedBundles({ size: 100 });
      setBundles(res.items);
    } catch (err) {
      console.error("Failed to load managed bundles:", err);
      setError("Không thể tải danh sách gói sản phẩm. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBundles();
  }, [refreshTrigger]);

  const statusCounts = useMemo(
    () => computeStatusCounts(bundles, (b) => b.status),
    [bundles],
  );

  const filteredBundles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bundles.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        b.bundleName.toLowerCase().includes(q) ||
        String(b.bundleId).includes(q) ||
        String(b.productId).includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    });
  }, [bundles, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col">
      <StoreListingToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={statusCounts}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm gói sản phẩm theo tên hoặc mã…"
        onRefresh={loadBundles}
        onReset={() => {
          setStatusFilter("ALL");
          setSearchQuery("");
        }}
        canReset={statusFilter !== "ALL" || searchQuery !== ""}
        rightAction={
          canManage &&
          onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#5fb97d] px-3 py-2 text-xs font-black text-white shadow-[1px_1px_0_#10351f] transition hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Tạo gói sản phẩm
            </button>
          )
        }
      />

      {error && (
        <div className="m-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-[#e3efe6] text-left text-[11px] font-black uppercase tracking-wide">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Mã sản phẩm</th>
              <th className="whitespace-nowrap px-4 py-3">Hình ảnh</th>
              <th className="whitespace-nowrap px-4 py-3">Tên gói Combo</th>
              <th className="whitespace-nowrap px-4 py-3">Mô tả</th>
              <th className="whitespace-nowrap px-4 py-3">Thành phần</th>
              <th className="whitespace-nowrap px-4 py-3">Giá gốc</th>
              <th className="whitespace-nowrap px-4 py-3">Giá ưu đãi</th>
              <th className="whitespace-nowrap px-4 py-3">Trạng thái</th>
              {canManage && <th className="whitespace-nowrap px-4 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-sm text-gray-500">
                  <div className="inline-flex items-center gap-2 font-medium">
                    <RefreshCw size={16} className="animate-spin text-primary-dark" />
                    Đang tải danh sách gói sản phẩm...
                  </div>
                </td>
              </tr>
            ) : filteredBundles.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Package size={32} className="text-gray-300" />
                    <p className="font-semibold text-gray-600">
                      Không tìm thấy gói Combo nào phù hợp bộ lọc.
                    </p>
                    {canManage && onCreate && (
                      <button
                        type="button"
                        onClick={onCreate}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary-dark underline hover:text-[#10351f]"
                      >
                        <Plus size={13} />
                        Tạo gói Combo mới ngay
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredBundles.map((bundle) => {
                const discount =
                  bundle.originalPrice && bundle.originalPrice > bundle.bundlePrice
                    ? Math.round((1 - bundle.bundlePrice / bundle.originalPrice) * 100)
                    : 0;
                const isDeleted = bundle.status === "DELETED";

                return (
                  <tr
                    key={bundle.bundleId}
                    className={`transition-colors ${
                      isDeleted ? "bg-neutral-100/60 opacity-45 grayscale" : "hover:bg-gray-50/60"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-black text-primary-dark">
                      #{bundle.productId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700">
                          <Boxes size={22} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-black text-gray-900 ${isDeleted ? "line-through text-neutral-500" : ""}`}>
                        {bundle.bundleName}
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-xs text-gray-600 truncate">
                      {bundle.description || (
                        <span className="italic text-gray-400">Không có mô tả</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">
                        <Sparkles size={11} />
                        {bundle.itemCount} mục
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-500 line-through">
                      {formatVnd(bundle.originalPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-primary-dark">
                        {formatVnd(bundle.bundlePrice)}
                      </div>
                      {discount > 0 && (
                        <span className="inline-block rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-700">
                          Tiết kiệm {discount}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={bundle.status} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(bundle.status === "UNPUBLISHED" || bundle.status === "ARCHIVED") && onPublish && (
                            <button
                              type="button"
                              onClick={() => onPublish(bundle)}
                              title={bundle.status === "ARCHIVED" ? "Mở bán lại gói Combo" : "Mở bán gói Combo lên Store"}
                              className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}

                          {bundle.status !== "DELETED" && onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(bundle)}
                              title="Chỉnh sửa chi tiết gói Combo"
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                            >
                              <Edit size={16} />
                            </button>
                          )}

                          {bundle.status !== "DELETED" && onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(bundle)}
                              title="Lưu trữ hoặc xóa gói Combo"
                              className="rounded p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

