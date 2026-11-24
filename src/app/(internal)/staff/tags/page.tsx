"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FolderTree,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import type { TagItem } from "@/api_client";
import {
  apiCreateStoreTag,
  apiDeleteStoreTag,
  apiUpdateStoreTag,
  fetchStoreTags,
} from "@/lib/api/products";

export default function StoreTagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagDescription, setTagDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTags = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchStoreTags();
      setTags(data);
    } catch (err: any) {
      setErrorMessage(err?.message || "Không thể tải danh sách thẻ sản phẩm.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const openCreateModal = () => {
    setEditingTag(null);
    setTagName("");
    setTagDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (tag: TagItem) => {
    setEditingTag(tag);
    setTagName(tag.name || "");
    setTagDescription(tag.description || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = tagName.trim();
    if (!trimmedName) {
      setFormError("Tên thẻ không được để trống.");
      return;
    }
    if (trimmedName.length > 100) {
      setFormError("Tên thẻ không được vượt quá 100 ký tự.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      if (editingTag && editingTag.tagId) {
        await apiUpdateStoreTag(editingTag.tagId, {
          name: trimmedName,
          description: tagDescription.trim() || undefined,
        });
        setSuccessMessage(`Đã cập nhật thẻ "${trimmedName}" thành công.`);
      } else {
        await apiCreateStoreTag({
          name: trimmedName,
          description: tagDescription.trim() || undefined,
        });
        setSuccessMessage(`Đã tạo thẻ "${trimmedName}" thành công.`);
      }
      setIsModalOpen(false);
      await loadTags();
    } catch (err: any) {
      const resData = err?.response?.data;
      if (err?.response?.status === 409 || resData?.code === "TAG_ALREADY_EXISTS") {
        setFormError("Tên thẻ này đã tồn tại trong hệ thống (không phân biệt chữ hoa, chữ thường).");
      } else if (err?.response?.status === 404) {
        setFormError("Không tìm thấy thẻ để cập nhật (404).");
      } else {
        setFormError(resData?.message || err?.message || "Đã xảy ra lỗi khi lưu thẻ.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTag || !deletingTag.tagId) return;

    setIsDeleting(true);
    try {
      await apiDeleteStoreTag(deletingTag.tagId);
      setSuccessMessage(`Đã xóa thẻ "${deletingTag.name}". Các sản phẩm liên kết đã được gỡ thẻ.`);
      setDeletingTag(null);
      await loadTags();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Xóa thẻ thất bại.");
      setDeletingTag(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTags = tags.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      String(t.tagId).includes(q)
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#0F5B38]">
              <TagIcon size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Quản lý thẻ sản phẩm</h1>
              <p className="text-xs text-gray-500">
                Tạo, chỉnh sửa và quản lý các thẻ danh mục phân loại cho Cửa hàng
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTags}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F5B38] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0c4a2d]"
          >
            <Plus size={16} />
            Tạo thẻ mới
          </button>
        </div>
      </div>

      {/* Thông báo Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <span className="flex-1">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage("")} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <span className="flex-1">{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thanh tìm kiếm & thống kê */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên thẻ, mã thẻ hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-[#0F5B38]"
          />
        </div>
        <span className="text-xs font-bold text-gray-500">
          Tổng cộng: <strong className="text-gray-900">{filteredTags.length}</strong> thẻ
        </span>
      </div>

      {/* Danh sách Thẻ Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-xs font-semibold text-gray-500">
            <Loader2 size={18} className="mr-2 animate-spin text-[#0F5B38]" />
            Đang tải danh sách thẻ từ máy chủ...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FolderTree size={36} className="mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-700">Không tìm thấy thẻ nào</p>
            <p className="text-xs text-gray-500">
              {searchQuery ? "Thử tìm kiếm với từ khóa khác." : "Hệ thống chưa có thẻ nào. Hãy tạo thẻ đầu tiên!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 pl-4 pr-3">Mã thẻ</th>
                  <th className="py-3 px-3">Tên thẻ phân loại</th>
                  <th className="py-3 px-3">Mô tả</th>
                  <th className="py-3 pl-3 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTags.map((tag) => (
                  <tr key={tag.tagId} className="transition-colors hover:bg-gray-50/70">
                    <td className="py-3.5 pl-4 pr-3 font-mono font-bold text-gray-500">
                      #{tag.tagId}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-xs font-bold text-[#0F5B38]">
                        <TagIcon size={12} />
                        {tag.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-gray-600 max-w-md">
                      {tag.description || <span className="italic text-gray-400">Không có mô tả</span>}
                    </td>
                    <td className="py-3.5 pl-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(tag)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-bold text-gray-700 transition hover:bg-gray-50 hover:text-blue-600"
                        >
                          <Edit2 size={12} /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTag(tag)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1 font-bold text-red-600 transition hover:bg-red-100"
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tạo / Sửa Thẻ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900">
                {editingTag ? "Chỉnh sửa thẻ sản phẩm" : "Tạo thẻ sản phẩm mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="mt-4 flex flex-col gap-4 text-left">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label htmlFor="tag-name" className="text-xs font-bold text-gray-700">
                  Tên thẻ <span className="text-red-500">*</span>
                </label>
                <input
                  id="tag-name"
                  type="text"
                  maxLength={100}
                  placeholder="Ví dụ: Hoạt hình, Xe cộ, Đèn LED, Nghệ thuật..."
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-[#0F5B38]"
                  required
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Tối đa 100 ký tự. Không được trùng lặp tên với các thẻ khác (không phân biệt chữ hoa, chữ thường).
                </p>
              </div>

              <div>
                <label htmlFor="tag-desc" className="text-xs font-bold text-gray-700">
                  Mô tả thẻ (tùy chọn)
                </label>
                <textarea
                  id="tag-desc"
                  rows={3}
                  placeholder="Mô tả danh mục phân loại này..."
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-[#0F5B38]"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F5B38] px-4 py-2 text-xs font-bold text-white hover:bg-[#0c4a2d] disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  {editingTag ? "Lưu thay đổi" : "Tạo thẻ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Thẻ */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-black text-gray-900">Xác nhận xóa thẻ?</h3>
            <p className="mt-2 text-xs text-gray-600">
              Bạn có chắc chắn muốn xóa thẻ{" "}
              <strong className="text-gray-900">"{deletingTag.name}"</strong> (Mã: #{deletingTag.tagId})?
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Hệ thống sẽ tự động gỡ thẻ này khỏi tất cả các sản phẩm đang liên kết mà không làm mất sản phẩm.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteTag}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

