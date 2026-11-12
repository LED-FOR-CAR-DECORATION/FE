"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
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
    <Modal
      title="Xóa sản phẩm khỏi Store?"
      description={`Bạn đang thực hiện xóa mềm sản phẩm #${productId} - ${productName}.`}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold hover:bg-[#eef8f0] disabled:opacity-50"
          >
            Hủy thao tác
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500 bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Xác nhận xóa
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950 mb-1">
            <AlertTriangle size={15} className="shrink-0 text-amber-700" />
            Cơ chế Xóa mềm (Soft Delete - AC02)
          </div>
          Sản phẩm sẽ được chuyển sang trạng thái <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">DELETED</code>. Sản phẩm sẽ bị ẩn hoàn toàn khỏi Store công khai và không thể đặt mua, nhưng toàn bộ lịch sử đơn hàng trước đây của khách hàng vẫn được bảo lưu nguyên vẹn.
        </div>
      </div>
    </Modal>
  );
}

