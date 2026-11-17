import type { ChangeEvent, ReactNode } from "react";
import {
  COMMISSION_FRAME_PRICE, COMMISSION_SIZES, MAX_COMMISSION_FRAMES, MIN_COMMISSION_FRAMES,
  formatCommissionMoney, type CommissionDesign,
} from "../config/fixedPricing";

export const commissionButton = "rounded-lg bg-[#155e59] px-4 py-2.5 font-semibold text-white hover:bg-[#0e4b47] disabled:opacity-50";
const field = "mt-1 block w-full rounded-lg border border-[#819e8c] bg-white p-2.5 text-[#26352f]";

export function CommissionDesignPicker({ design, onChange }: {
  design: CommissionDesign;
  onChange: (design: CommissionDesign) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label>
        Kích thước ma trận LED
        <select className={field} value={design.size} onChange={(event) =>
          onChange({ ...design, size: event.target.value as CommissionDesign["size"] })}>
          {(Object.keys(COMMISSION_SIZES) as CommissionDesign["size"][]).map((size) => (
            <option key={size} value={size}>
              {size.replace("x", " × ")}{design.format === "image" ? ` · ${formatCommissionMoney(COMMISSION_SIZES[size])}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Định dạng
        <select className={field} value={design.format} onChange={(event) =>
          onChange({ ...design, format: event.target.value as CommissionDesign["format"] })}>
          <option value="image">Ảnh tĩnh</option>
          <option value="gif">GIF động · {formatCommissionMoney(COMMISSION_FRAME_PRICE)}/frame</option>
        </select>
      </label>
      <label>
        Độ chi tiết
        <select className={field} value={design.detail}
          onChange={(event) => onChange({ ...design, detail: event.target.value })}>
          <option>Cơ bản</option>
          <option>Vừa</option>
          <option>Cao</option>
        </select>
      </label>
      {design.format === "gif" && (
        <label>
          Số frame ({MIN_COMMISSION_FRAMES}–{MAX_COMMISSION_FRAMES})
          <input className={field} type="number" min={MIN_COMMISSION_FRAMES} max={MAX_COMMISSION_FRAMES}
            step={1} value={design.frames} onChange={(event) => onChange({ ...design, frames: event.target.value })} />
        </label>
      )}
      <label>
        Phông nền
        <select className={field} value={design.background}
          onChange={(event) => onChange({ ...design, background: event.target.value })}>
          <option>Trong suốt</option>
          <option>Đơn sắc</option>
          <option>Bối cảnh tùy chỉnh</option>
        </select>
      </label>
    </div>
  );
}

export function CommissionBrief({ note, onNote, references, onFiles, onRemove, error }: {
  note: string;
  onNote: (note: string) => void;
  references: File[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  error: string;
}) {
  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    onFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }
  return (
    <div className="space-y-4">
      <label className="block">
        Brief thiết kế
        <textarea className={field} rows={5} maxLength={1000} required value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Mô tả nhân vật, màu sắc và hiệu ứng LED bạn muốn." />
      </label>
      <label className="block">
        Ảnh tham khảo (không bắt buộc, tối đa 5 ảnh, 5 MB mỗi ảnh)
        <input className={field} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={chooseFiles} disabled={references.length >= 5} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {references.length > 0 && (
        <ul className="space-y-2">
          {references.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3">
              <span className="min-w-0 break-all">{file.name}</span>
              <button type="button" className="shrink-0 font-semibold text-red-700"
                aria-label={`Xóa ${file.name}`} onClick={() => onRemove(index)}>Xóa</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommissionPayment({ code, amount, onPay, onBack }: {
  code: string; amount: number; onPay: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <p>Thanh toán SePay mô phỏng. Tài khoản nhận tiền là tài khoản demo.</p>
      <dl className="space-y-2 rounded-lg bg-white p-4">
        <div><dt>Số tiền</dt><dd className="font-bold">{formatCommissionMoney(amount)}</dd></div>
        <div><dt>Nội dung chuyển khoản</dt><dd className="font-mono font-bold">{code}</dd></div>
      </dl>
      <CommissionActions>
        <button type="button" onClick={onBack}>Quay lại brief</button>
        <button type="button" className={commissionButton} onClick={onPay}>Mô phỏng thanh toán thành công</button>
      </CommissionActions>
    </div>
  );
}

export function CommissionActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-4">{children}</div>;
}
