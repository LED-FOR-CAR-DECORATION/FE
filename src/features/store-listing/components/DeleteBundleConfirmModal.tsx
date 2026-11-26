"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { apiDeleteBundle, type ManagedBundleItem } from "@/lib/api/bundles";
import StoreModal from "./StoreModal";

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
    <StoreModal
      title="Xóa / Ngưng gói Combo?"
      description={`Bạn có chắc chắn muốn xóa gói "${bundle.bundleName}" (Mã #${bundle.bundleId})?`}
      icon={<AlertTriangle size={18} />}
      iconBoxClassName="bg-[#fecaca]"
      onClose={onClose}
      busy={isDeleting}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Trash2 size={14} aria-hidden="true" />
                Xác nhận Xóa / Ngưng
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="border-2 border-black bg-[#fef08a]/70 p-3.5 text-xs font-medium text-black shadow-[2px_2px_0_0_#000]">
          <p className="mb-1.5 font-black uppercase tracking-wide">
            Quy tắc bảo toàn dữ liệu (BR-FL5-03):
          </p>
          <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed">
            <li>
              Nếu gói combo đã từng được khách hàng đặt mua, hệ thống sẽ thực hiện{" "}
              <strong className="font-black">Soft-delete</strong> (chuyển sang trạng thái{" "}
              <em>Đã lưu trữ / Đã xóa</em>) để giữ nguyên lịch sử đơn hàng.
            </li>
            <li>Nếu chưa từng có đơn hàng nào, hệ thống sẽ tự động gỡ bỏ gói.</li>
          </ul>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </StoreModal>
  );
}
