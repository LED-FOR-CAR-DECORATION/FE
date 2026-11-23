"use client";

import { useState } from "react";
import { CheckCircle, Loader2, X } from "lucide-react";
import NeoDialog from "@/components/ui/NeoDialog";
import ConsentCheckbox, { PolicyLink } from "@/components/ui/ConsentCheckbox";

const CANCEL_PRESETS = ["Đổi ý trước khi giao hàng", "Muốn đổi sản phẩm / số lượng", "Thay đổi địa chỉ nhận hàng"];

interface CancelOrderDialogProps {
  orderId: string;
  /** Paid and waiting to be packed: cancelling triggers a refund. */
  isPaid: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  error?: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Customer cancel-order dialog with required refund-policy consent (UI standard §5.1). */
export function CancelOrderDialog({
  orderId,
  isPaid,
  reason,
  onReasonChange,
  error,
  busy,
  onClose,
  onConfirm,
}: CancelOrderDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const reasonId = `cancel-reason-${orderId}`;

  return (
    <NeoDialog
      tone="danger"
      title={`Hủy đơn hàng #${orderId}`}
      description={
        isPaid
          ? "Đơn đã thanh toán và đang chờ đóng gói. Khi hủy, đơn chuyển sang Đã hoàn tiền và tồn kho được hoàn lại."
          : "Đơn sẽ bị hủy và tồn kho sản phẩm được hoàn lại."
      }
      onClose={onClose}
      busy={busy}
      dismissOnBackdrop={!reason}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Giữ đơn hàng
          </button>
          <button
            type="button"
            className="btn-danger inline-flex items-center gap-1.5"
            onClick={onConfirm}
            disabled={busy || !agreed}
            aria-busy={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            {busy ? "Đang hủy đơn..." : `Hủy đơn #${orderId}`}
          </button>
        </>
      }
    >
      <label htmlFor={reasonId} className="block text-xs font-bold uppercase">
        Lý do hủy đơn (tùy chọn)
      </label>
      <textarea
        id={reasonId}
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder="Ví dụ: Đổi ý, muốn chọn sản phẩm khác..."
        className="mt-1.5 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CANCEL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onReasonChange(preset)}
            className={`border-2 px-2.5 py-1 text-xs font-semibold ${
              reason === preset ? "border-black bg-primary/20" : "border-black bg-white hover:bg-gray-50"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <ConsentCheckbox checked={agreed} onChange={setAgreed} disabled={busy} className="mt-4">
        Tôi hiểu đơn #{orderId} sẽ bị hủy
        {isPaid ? " và việc hoàn tiền áp dụng theo " : " theo "}
        <PolicyLink href="/shipping-returns">Chính sách vận chuyển &amp; đổi trả</PolicyLink>.
      </ConsentCheckbox>

      {error && (
        <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </p>
      )}
    </NeoDialog>
  );
}

interface ConfirmReceivedDialogProps {
  orderId: string;
  error?: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Customer "received the package" dialog; completing the order is irreversible so consent is required. */
export function ConfirmReceivedDialog({ orderId, error, busy, onClose, onConfirm }: ConfirmReceivedDialogProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <NeoDialog
      title="Xác nhận đã nhận hàng"
      description={`Đơn hàng #${orderId} sẽ chuyển sang Đã hoàn thành.`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Chưa nhận được
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5"
            onClick={onConfirm}
            disabled={busy || !agreed}
            aria-busy={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {busy ? "Đang xử lý..." : "Xác nhận đã nhận hàng"}
          </button>
        </>
      }
    >
      <ConsentCheckbox checked={agreed} onChange={setAgreed} disabled={busy}>
        Tôi đã nhận và kiểm tra hàng. Sau khi xác nhận, đơn sẽ hoàn tất và <strong>không thể hoàn tác</strong>.
      </ConsentCheckbox>
      {error && (
        <p role="alert" className="mt-3 border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </p>
      )}
    </NeoDialog>
  );
}
