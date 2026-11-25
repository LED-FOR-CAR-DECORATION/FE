"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import StoreModal from "./StoreModal";
import { apiDeleteStoreProduct } from "@/lib/api/products";
import { markProductAsDeleted } from "../services/store-listing.service";

interface DeleteProductConfirmModalProps {
  productId: string | number;
  productName: string;
  onClose: () => void;
  onSuccess: (productName: string) => void;
}

export default function DeleteProductConfirmModal({
  productId,
  productName,
  onClose,
  onSuccess,
}: DeleteProductConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    const numericId = Number(productId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError("Mã sản phẩm không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiDeleteStoreProduct(numericId);
      markProductAsDeleted(productId);
      onSuccess(productName);
      onClose();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Đã được xóa mềm trên máy chủ
        markProductAsDeleted(productId);
        onSuccess(productName);
        onClose();
        return;
      }
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Xóa sản phẩm thất bại. Vui lòng thử lại.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      title="Xóa sản phẩm khỏi cửa hàng?"
      description={`Bạn đang thực hiện xóa mềm sản phẩm #${productId} - ${productName}.`}
      icon={<Trash2 size={18} />}
      iconBoxClassName="bg-[#fecaca]"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Hủy thao tác
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="btn-danger inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
            Xác nhận xóa
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="border-2 border-black bg-[#fef08a]/70 p-3.5 text-xs font-medium leading-relaxed text-black shadow-[2px_2px_0_0_#000]">
          <div className="mb-1.5 flex items-center gap-2 font-black uppercase tracking-wide text-black">
            <AlertTriangle size={15} className="shrink-0 text-black" aria-hidden="true" />
            Lưu ý khi xóa mềm sản phẩm
          </div>
          Sản phẩm sẽ được chuyển sang trạng thái Đã xóa, ẩn hoàn toàn khỏi cửa hàng công khai và không thể đặt mua, nhưng toàn bộ lịch sử đơn hàng trước đây của khách hàng vẫn được bảo lưu nguyên vẹn.
        </div>
      </div>
    </StoreModal>
  );
}
