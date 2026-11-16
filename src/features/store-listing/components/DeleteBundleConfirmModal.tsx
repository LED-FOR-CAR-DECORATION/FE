"use client";

import { useId, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { apiDeleteBundle, type ManagedBundleItem } from "@/lib/api/bundles";

interface DeleteBundleConfirmModalProps {
  bundle: ManagedBundleItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteBundleConfirmModal({
  bundle,
  onClose,
  onSuccess,
}: DeleteBundleConfirmModalProps) {
  const modalTitleId = useId();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await apiDeleteBundle(bundle.bundleId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Delete bundle failed:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Xóa gói combo thất bại.";
      setErrorMessage(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border-2 border-rose-900 bg-white p-6 shadow-[6px_6px_0_#881337] overflow-hidden my-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-300 bg-rose-100 text-rose-700">
            <AlertTriangle size={22} />
          </span>
          <div>
            <h2 id={modalTitleId} className="text-base font-black text-gray-900">
              Xóa / Ngưng gói Combo?
            </h2>
            <p className="mt-1 text-xs font-semibold text-gray-600">
              Bạn có chắc chắn muốn xóa gói{" "}
              <span className="font-black text-gray-900">
                &ldquo;{bundle.bundleName}&rdquo;
              </span>{" "}
              (Mã #{bundle.bundleId})?
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
          <p className="font-bold mb-1">Quy tắc bảo toàn dữ liệu (BR-FL5-03):</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>
              Nếu gói combo đã từng được khách hàng đặt mua, hệ thống sẽ thực hiện{" "}
              <strong>Soft-delete</strong> (chuyển sang trạng thái <em>Đã lưu trữ / Đã xóa</em>) để giữ nguyên lịch sử đơn hàng.
            </li>
            <li>Nếu chưa từng có đơn hàng nào, hệ thống sẽ tự động gỡ bỏ gói.</li>
          </ul>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rose-900 bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0_#881337] hover:bg-rose-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Trash2 size={13} />
                Xác nhận Xóa / Ngưng
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

