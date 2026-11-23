"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, ShieldOff } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  apiDeprecateLedModel,
  formatLedModelError,
  type ManagedLedModelItem,
} from "@/lib/api/ledModels";

interface DeprecateLedModelModalProps {
  model: ManagedLedModelItem;
  onClose: () => void;
  onSuccess: (model: ManagedLedModelItem) => void;
}

export default function DeprecateLedModelModal({
  model,
  onClose,
  onSuccess,
}: DeprecateLedModelModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiDeprecateLedModel(model.modelId);
      onSuccess(model);
      onClose();
    } catch (err) {
      setError(
        formatLedModelError(err, "Không thể ngừng kinh doanh mẫu LED này."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Ngừng kinh doanh mẫu LED"
      description={`Xác nhận ngừng kinh doanh mẫu "${model.modelName}" (ID #${model.modelId}).`}
      onClose={onClose}
      busy={isSubmitting}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-red-800 bg-red-600 px-4 py-2 text-sm font-black text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <ShieldOff size={15} />
                Xác nhận ngừng kinh doanh
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              Mẫu LED <strong>{model.modelName}</strong> sẽ chuyển sang trạng thái{" "}
              <strong>Ngừng kinh doanh</strong> (xóa mềm, không xóa lịch sử dữ liệu) và ngừng cấp phát thiết bị mới.
            </li>
            {model.productId != null && (
              <li>
                Sản phẩm Cửa hàng đang liên kết (<strong>Mã SP #{model.productId}</strong>) nếu đang mở bán sẽ tự động chuyển sang trạng thái <strong>Đã lưu trữ</strong>.
              </li>
            )}
            <li>
              Toàn bộ thiết bị vật lý khách hàng đã mua hoặc đang kích hoạt vẫn hoạt động, cập nhật firmware và bảo hành bình thường.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
