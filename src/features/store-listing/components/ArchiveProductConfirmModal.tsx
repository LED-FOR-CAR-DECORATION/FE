"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Loader2 } from "lucide-react";
import StoreModal from "./StoreModal";
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
    <StoreModal
      title="Ngừng bán sản phẩm?"
      description={`Chuyển sản phẩm #${productId} - ${productName} sang trạng thái Ngừng bán (ARCHIVED).`}
      icon={<Archive size={18} />}
      iconBoxClassName="bg-[#fef08a]"
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
            onClick={handleArchive}
            disabled={isSubmitting}
            className="btn-danger inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Archive size={15} aria-hidden="true" />}
            Xác nhận ngừng bán
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

        <div className="border-2 border-black bg-[#fef08a]/60 p-3.5 text-xs font-semibold leading-relaxed text-black shadow-[2px_2px_0_0_#000]">
          Sản phẩm đã lưu trữ sẽ không thể tiếp tục đặt mua (ngừng bán), nhưng vẫn cho phép khách hàng xem trang chi tiết công khai và lịch sử đơn hàng cũ vẫn được bảo toàn.
        </div>
      </div>
    </StoreModal>
  );
}
