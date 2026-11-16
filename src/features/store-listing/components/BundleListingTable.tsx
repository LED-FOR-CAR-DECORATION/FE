"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Edit,
  EyeOff,
  Info,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Sparkles,
} from "lucide-react";
import { fetchManagedBundles, type ManagedBundleItem } from "@/lib/api/bundles";
import { formatVnd } from "../format";

interface BundleListingTableProps {
  canManage?: boolean;
  onEdit?: (bundle: ManagedBundleItem) => void;
  onPublish?: (bundle: ManagedBundleItem) => void;
  onUnlist?: (bundle: ManagedBundleItem) => void;
  onDelete?: (bundle: ManagedBundleItem) => void;
  onCreate?: () => void;
  refreshTrigger?: number;
}

type StatusFilter = "ALL" | "UNPUBLISHED" | "PUBLISHED" | "ARCHIVED" | "DELETED";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadBundles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchManagedBundles({
        size: 100,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
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
  }, [statusFilter, refreshTrigger]);

  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return bundles;
    const q = searchQuery.toLowerCase().trim();
    return bundles.filter(
      (b) =>
        b.bundleName.toLowerCase().includes(q) ||
        String(b.bundleId).includes(q) ||
        String(b.productId).includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)),
    );
  }, [bundles, searchQuery]);

  const statusBadges: Record<
    ManagedBundleItem["status"],
    { label: string; className: string }
  > = {
    PUBLISHED: {
      label: "Đang mở bán",
      className: "border-green-600 bg-green-100 text-green-900",
    },
    UNPUBLISHED: {
      label: "Chờ mở bán",
      className: "border-amber-500 bg-amber-50 text-amber-900",
    },
    ARCHIVED: {
      label: "Đã lưu trữ",
      className: "border-gray-400 bg-gray-100 text-gray-700",
    },
    DELETED: {
      label: "Đã xóa mềm",
      className: "border-rose-400 bg-rose-50 text-rose-800",
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3efe6] p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "ALL", label: "Tất cả" },
              { id: "PUBLISHED", label: "Đang mở bán" },
              { id: "UNPUBLISHED", label: "Chờ mở bán" },
              { id: "ARCHIVED", label: "Đã lưu trữ" },
              { id: "DELETED", label: "Đã xóa" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? "border border-[#3f9660] bg-[#8bd49f] text-[#10351f] shadow-[1px_1px_0_#3f9660]"
                  : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Tìm kiếm bundle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-xs font-medium focus:border-primary-dark focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={loadBundles}
            disabled={isLoading}
            title="Tải lại danh sách"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>

          {canManage && onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#5fb97d] px-3 text-xs font-black text-white shadow-[1px_1px_0_#10351f] transition hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Tạo gói Combo
            </button>
          )}
        </div>
      </div>

      <p className="mx-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        Quản lý các gói Combo kết hợp giữa bảng LED và hoạt ảnh nhân vật. Giá bán ưu đãi của gói combo không được vượt quá tổng giá gốc của các linh kiện thành phần cấu thành.
      </p>

      {error && (
        <div className="mx-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-[#e3efe6] bg-[#f9fbf9] text-left text-xs font-black uppercase tracking-wider text-text-muted">
            <tr>
              <th className="px-4 py-3">Mã Bundle</th>
              <th className="px-4 py-3">Hình ảnh</th>
              <th className="px-4 py-3">Tên gói Combo</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3">Thành phần</th>
              <th className="px-4 py-3">Giá gốc</th>
              <th className="px-4 py-3">Giá ưu đãi</th>
              <th className="px-4 py-3">Trạng thái</th>
              {canManage && <th className="px-4 py-3 text-right">Thao tác</th>}
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

                const statusInfo = statusBadges[bundle.status] ?? {
                  label: bundle.status,
                  className: "border-gray-200 bg-gray-50 text-gray-700",
                };

                return (
                  <tr key={bundle.bundleId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">
                      #{bundle.bundleId}
                      <span className="block text-[10px] font-normal text-gray-400">
                        SP #{bundle.productId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700">
                          <Boxes size={22} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-gray-900">{bundle.bundleName}</div>
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
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {bundle.status === "UNPUBLISHED" && onPublish && (
                            <button
                              type="button"
                              onClick={() => onPublish(bundle)}
                              title="Mở bán gói Combo lên Store"
                              className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}

                          {bundle.status === "PUBLISHED" && onUnlist && (
                            <button
                              type="button"
                              onClick={() => onUnlist(bundle)}
                              title="Ẩn gói Combo khỏi Store"
                              className="rounded p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800"
                            >
                              <EyeOff size={16} />
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

