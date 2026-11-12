"use client";

import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { apiUpdateProductStatus } from "@/lib/api/products";

interface ArchiveProductConfirmModalProps {
  productId: string | number;
  productName: string;
  onClose: () => void;
  onSuccess: (productName: string) => void;
}

export default function ArchiveProductConfirmModal({
  productId,
  productName,
  onClose,
  onSuccess,
}: ArchiveProductConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    const numericId = Number(productId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError("Mã sản phẩm không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiUpdateProductStatus(numericId, "ARCHIVED");
      onSuccess(productName);
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Lưu trữ sản phẩm thất bại. Vui lòng thử lại.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Lưu trữ sản phẩm (Archive)?"
      description={`Chuyển sản phẩm #${productId} - ${productName} sang trạng thái ARCHIVED.`}
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
            onClick={handleArchive}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-400 bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
            Xác nhận lưu trữ
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

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
          <span className="font-bold">Đặc tả Story 3 (AC03):</span> Sản phẩm lưu trữ (<code className="bg-blue-100 px-1 py-0.5 rounded font-bold">ARCHIVED</code>) sẽ không thể tiếp tục đặt mua (ngừng bán), nhưng vẫn cho phép khách hàng xem trang chi tiết công khai và lịch sử đơn hàng cũ vẫn được bảo toàn.
        </div>
      </div>
    </Modal>
  );
}

