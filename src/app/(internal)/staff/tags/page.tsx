"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
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
    <div className="manager-neo-dashboard mx-auto w-full max-w-[1440px] font-sans text-text-main">
      <div className="flex flex-col gap-6">
        {/* Top Header Banner */}
        <header className="border-2 border-black border-l-8 border-l-primary bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  PHÂN LOẠI CỬA HÀNG
                </span>
                <nav
                  aria-label="Đường dẫn"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                >
                  <span>Quản lý</span>
                  <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                  <span className="text-black">Thẻ sản phẩm</span>
                </nav>
              </div>

              <div className="flex items-center gap-2.5">
                <TagIcon
                  size={24}
                  className="shrink-0 text-primary-ink"
                  aria-hidden="true"
                />
                <h1 className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
                  Quản lý thẻ sản phẩm
                </h1>
              </div>

              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Tạo, chỉnh sửa và quản lý các thẻ danh mục phân loại cho Cửa hàng.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={loadTags}
                disabled={isLoading}
                className="btn-secondary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                Làm mới
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-primary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
                Tạo thẻ mới
              </button>
            </div>
          </div>

          {/* Search & Stats Toolbar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-gray-200 pt-4">
            <div className="relative min-w-[260px] max-w-md flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                aria-label="Tìm kiếm thẻ sản phẩm"
                placeholder="Tìm theo tên thẻ, mã thẻ hoặc mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 border-black bg-gray-50 py-2 pl-9 pr-3 text-xs font-bold text-black placeholder:text-text-muted focus:bg-white"
              />
            </div>

            <span className="inline-flex items-center gap-1.5 border border-black bg-primary/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black tabular-nums shadow-[1px_1px_0_0_#000]">
              Tổng cộng: <strong>{filteredTags.length}</strong> thẻ
            </span>
          </div>
        </header>

        {/* Thông báo Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 border-2 border-black bg-[#fee2e2] px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <span className="flex items-start gap-2.5">
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0 text-red-700"
                aria-hidden="true"
              />
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="Đóng thông báo lỗi"
              className="shrink-0 cursor-pointer border border-black bg-white p-1 text-black transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start justify-between gap-3 border-2 border-black bg-primary/35 px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <span className="flex items-start gap-2.5">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-primary-ink"
                aria-hidden="true"
              />
              <span>{successMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Đóng thông báo"
              className="shrink-0 cursor-pointer border border-black bg-white p-1 text-black transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Danh sách Thẻ Table Panel */}
        <section
          aria-label="Danh sách thẻ sản phẩm"
          className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
                <TagIcon className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                    Danh sách thẻ phân loại
                  </h2>
                  <span className="inline-flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black tabular-nums shadow-[1px_1px_0_0_#000]">
                    {filteredTags.length} thẻ
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-text-muted">
                  Quản lý mã thẻ, tên hiển thị và mô tả cho từng nhóm sản phẩm trên cửa hàng.
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 flex items-center justify-center border-2 border-dashed border-black/25 bg-gray-50 p-12 text-xs font-black uppercase tracking-wider text-black">
              <Loader2
                size={18}
                className="mr-2.5 animate-spin text-primary-ink"
                aria-hidden="true"
              />
              Đang tải danh sách thẻ từ máy chủ...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center border-2 border-dashed border-black/25 bg-gray-50 px-6 py-12 text-center">
              <div className="mb-3 grid h-11 w-11 place-items-center border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
                <FolderTree size={22} className="text-black" aria-hidden="true" />
              </div>
              <p className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                Không tìm thấy thẻ nào
              </p>
              <p className="mt-1 text-xs font-medium text-text-muted">
                {searchQuery
                  ? "Thử tìm kiếm với từ khóa khác."
                  : "Hệ thống chưa có thẻ nào. Hãy tạo thẻ đầu tiên!"}
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto border-2 border-black">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                    <th className="px-4 py-3 text-left">Mã thẻ</th>
                    <th className="px-4 py-3 text-left">Tên thẻ phân loại</th>
                    <th className="px-4 py-3 text-left">Mô tả</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 bg-white">
                  {filteredTags.map((tag) => (
                    <tr
                      key={tag.tagId}
                      className="transition-colors duration-150 hover:bg-[#f3faf5]"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                          #{tag.tagId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 border border-black bg-primary/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                          <TagIcon size={11} aria-hidden="true" />
                          {tag.name}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3.5 text-xs font-medium text-text-muted">
                        {tag.description || (
                          <span className="italic text-text-muted/75">Không có mô tả</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(tag)}
                            className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                          >
                            <Edit2 size={12} aria-hidden="true" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTag(tag)}
                            className="btn-danger inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                          >
                            <Trash2 size={12} aria-hidden="true" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 pt-3 text-xs font-medium text-text-muted">
            <span>
              Hiển thị <strong className="font-black text-black tabular-nums">{filteredTags.length}</strong> /{" "}
              <strong className="font-black text-black tabular-nums">{tags.length}</strong> thẻ sản phẩm trên hệ thống.
            </span>
          </div>
        </section>
      </div>

      {/* Modal Tạo / Sửa Thẻ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tag-modal-title"
            className="w-full max-w-md border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
              <div>
                <span className="inline-flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                  {editingTag ? `Cập nhật #${editingTag.tagId}` : "Thẻ phân loại mới"}
                </span>
                <h3
                  id="tag-modal-title"
                  className="mt-2 text-base font-black uppercase tracking-tight text-black"
                >
                  {editingTag ? "Chỉnh sửa thẻ sản phẩm" : "Tạo thẻ sản phẩm mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng hộp thoại"
                className="cursor-pointer border-2 border-black bg-white p-1.5 text-black transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="mt-4 flex flex-col gap-4 text-left">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
                >
                  <AlertCircle
                    size={15}
                    className="mt-0.5 shrink-0 text-red-700"
                    aria-hidden="true"
                  />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="tag-name"
                  className="block text-[11px] font-black uppercase tracking-wider text-black"
                >
                  Tên thẻ <span className="text-red-600">*</span>
                </label>
                <input
                  id="tag-name"
                  type="text"
                  maxLength={100}
                  placeholder="Ví dụ: Hoạt hình, Xe cộ, Đèn LED, Nghệ thuật..."
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="mt-1.5 w-full border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black placeholder:text-text-muted focus:bg-white"
                  required
                />
                <p className="mt-1.5 text-[11px] font-medium text-text-muted">
                  Tối đa 100 ký tự. Không được trùng lặp tên với các thẻ khác (không phân biệt chữ hoa, chữ thường).
                </p>
              </div>

              <div>
                <label
                  htmlFor="tag-desc"
                  className="block text-[11px] font-black uppercase tracking-wider text-black"
                >
                  Mô tả thẻ (tùy chọn)
                </label>
                <textarea
                  id="tag-desc"
                  rows={3}
                  placeholder="Mô tả danh mục phân loại này..."
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  className="mt-1.5 w-full border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black placeholder:text-text-muted focus:bg-white"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                >
                  {isSubmitting && (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  )}
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tag-modal-title"
            className="w-full max-w-md border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
              <div>
                <span className="inline-flex items-center gap-1 border border-black bg-[#fecaca] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                  Cảnh báo xóa
                </span>
                <h3
                  id="delete-tag-modal-title"
                  className="mt-2 text-base font-black uppercase tracking-tight text-black"
                >
                  Xác nhận xóa thẻ?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                disabled={isDeleting}
                aria-label="Đóng hộp thoại xác nhận xóa"
                className="cursor-pointer border-2 border-black bg-white p-1.5 text-black transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-60"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <p className="font-bold text-black">
                Bạn có chắc chắn muốn xóa thẻ{" "}
                <span className="inline-flex items-center gap-1 border border-black bg-primary/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                  {deletingTag.name}
                </span>{" "}
                <span className="font-mono font-black text-text-muted">(#{deletingTag.tagId})</span>?
              </p>
              <p className="border-2 border-dashed border-black/25 bg-gray-50 p-3 font-medium text-text-muted">
                Hệ thống sẽ tự động gỡ thẻ này khỏi tất cả các sản phẩm đang liên kết mà không làm mất sản phẩm.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                disabled={isDeleting}
                className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteTag}
                disabled={isDeleting}
                className="btn-danger inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                {isDeleting && (
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                )}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

