import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { CheckCircle2, Plus, Trash2, Upload, X } from "lucide-react";
import {
  COMMISSION_DESIGN_FIELDS, MAX_COMMISSION_FRAMES, MIN_COMMISSION_FRAMES,
  formatCommissionMoney, type CommissionDesign, type CommissionDesignField,
} from "../config/fixedPricing";

export const commissionButton = "rounded-lg bg-[#155e59] px-4 py-2.5 font-semibold text-white hover:bg-[#0e4b47] disabled:opacity-50";
const field = "mt-1 block w-full rounded-lg border border-[#819e8c] bg-white p-2.5 text-[#26352f]";

export function CommissionDesignPicker({ design, onChange, fields = COMMISSION_DESIGN_FIELDS }: {
  design: CommissionDesign;
  onChange: (design: CommissionDesign) => void;
  fields?: readonly CommissionDesignField[];
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map(({ key, label, options }) => (
        <label key={key}>
          {label}
          <select className={field} value={design[key]}
            onChange={(event) => onChange({ ...design, [key]: event.target.value })}>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {key === "palette" && (
            <span className="mt-1 block text-sm">Ưu tiên màu sáng, neon hoặc tương phản cao để dễ nhìn trên kính lái. Hạn chế tông quá tối.</span>
          )}
          {key === "outline" && design.background === "Trong suốt" && (
            <span className="mt-1 block text-sm">Viền trắng hoặc màu sáng giúp đối tượng nổi bật trên nền trong suốt.</span>
          )}
        </label>
      ))}
      {design.format === "gif" && (
        <label>
          Số frame ({MIN_COMMISSION_FRAMES}–{MAX_COMMISSION_FRAMES})
          <input className={field} type="number" min={MIN_COMMISSION_FRAMES} max={MAX_COMMISSION_FRAMES}
            step={1} value={design.frames} onChange={(event) => onChange({ ...design, frames: event.target.value })} />
        </label>
      )}
    </div>
  );
}

function ReferenceThumbnail({ file, compact = false }: { file: File; compact?: boolean }) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      className={
        compact
          ? "grid h-14 w-full shrink-0 place-items-center overflow-hidden bg-primary/15"
          : "grid size-16 shrink-0 place-items-center overflow-hidden border-2 border-black bg-primary/15"
      }
    >
      {src && <img src={src} alt={compact ? file.name : ""} className="size-full object-contain" />}
    </div>
  );
}

export function CommissionBrief({ note, onNote, references, onFiles, onRemove, error, maxNoteLength = 1000, compact = false }: {
  note: string;
  onNote: (note: string) => void;
  references: File[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  error: string;
  maxNoteLength?: number;
  compact?: boolean;
}) {
  const fileInputId = useId();

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    onFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div>
        <div className={compact ? "mb-1 flex items-center justify-between gap-2" : "mb-1.5 flex items-center justify-between gap-2"}>
          <label htmlFor="commission-brief-note" className="block text-xs font-bold uppercase text-text-main">
            Mô tả ý tưởng thiết kế <span aria-hidden className="text-red-600">*</span>
          </label>
          <span className="text-xs font-semibold tabular-nums text-text-muted">
            {note.length}/{maxNoteLength}
          </span>
        </div>
        <textarea
          id="commission-brief-note"
          className={`block w-full border-2 border-black bg-gray-50 text-sm font-medium text-text-main transition-colors focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-60 ${
            compact ? "p-2.5 text-xs" : "p-3"
          }`}
          rows={compact ? 3 : 5}
          maxLength={maxNoteLength}
          required
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Ghi tên đối tượng, biểu cảm (vui, giận, ngạc nhiên), tư thế (vẫy tay, giơ ngón cái), màu chủ đạo và đặc điểm cần giữ (kính, tóc, mũ)..."
        />
        <p className="mt-1 text-[11px] text-text-muted">
          Mẹo: Với ma trận 32×32 trở xuống, hãy ghi rõ chi tiết cần nhấn mạnh để hiển thị nét trên LED.
        </p>
      </div>

      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase text-text-main">
            Ảnh tham khảo ({references.length}/5 · tối đa 5 MB/ảnh)
          </span>

          {references.length > 0 && references.length < 5 && (
            <label
              htmlFor={fileInputId}
              className={`btn-secondary inline-flex cursor-pointer items-center gap-1.5 font-black uppercase ${
                compact ? "h-7 px-2.5 py-0 text-[11px]" : "min-h-9 px-3 py-1.5 text-xs"
              }`}
            >
              <Plus size={compact ? 12 : 14} />
              Thêm ảnh
            </label>
          )}

          {references.length >= 5 && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 border border-black bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary-ink"
            >
              <CheckCircle2 size={13} className="shrink-0" />
              Đã đủ tối đa 5/5 ảnh tham khảo
            </span>
          )}
        </div>

        <input
          id={fileInputId}
          className="sr-only"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={chooseFiles}
          disabled={references.length >= 5}
        />

        {references.length === 0 ? (
          <label
            htmlFor={fileInputId}
            className={`flex cursor-pointer border-2 border-dashed border-black bg-gray-50 transition-colors hover:bg-primary/10 ${
              compact
                ? "h-20 flex-row items-center justify-center gap-3 px-4"
                : "min-h-24 flex-col items-center justify-center gap-2 p-4 text-center"
            }`}
          >
            <Upload size={compact ? 18 : 20} className="shrink-0 text-primary-ink" />
            <div className={compact ? "text-left" : "contents"}>
              <span className="block text-xs font-black uppercase text-black">
                Chọn ảnh mẫu từ thiết bị
              </span>
              <span className="block text-[11px] text-text-muted">
                Hỗ trợ JPG, PNG, WEBP, GIF (tối đa 5 ảnh)
              </span>
            </div>
          </label>
        ) : compact ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {references.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="relative flex flex-col overflow-hidden border-2 border-black bg-white shadow-[2px_2px_0_0_#000]"
              >
                <ReferenceThumbnail file={file} compact />
                <div className="border-t border-black bg-white px-1.5 py-1">
                  <p title={file.name} className="truncate text-[10px] font-bold text-black">
                    {file.name}
                  </p>
                </div>
                <button
                  type="button"
                  className="absolute right-1 top-1 grid size-5 cursor-pointer place-items-center border border-black bg-white text-red-600 shadow-[1px_1px_0_0_#000] transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black"
                  aria-label={`Xóa ${file.name}`}
                  onClick={() => onRemove(index)}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {references.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 border-2 border-black bg-white p-2.5 shadow-[2px_2px_0_0_#000]"
              >
                <ReferenceThumbnail file={file} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-black">{file.name}</p>
                  <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  className="grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center border-2 border-black bg-white text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  aria-label={`Xóa ${file.name}`}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="border-2 border-red-600 bg-red-50 p-2.5 text-xs font-bold text-red-700">
          {error}
        </p>
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
