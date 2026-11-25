"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { LedSpecAttributeInput } from "@/lib/api/ledModels";

interface LedSpecAttributesEditorProps {
  attributes: LedSpecAttributeInput[];
  onChange: (next: LedSpecAttributeInput[]) => void;
  disabled?: boolean;
}

export default function LedSpecAttributesEditor({
  attributes,
  onChange,
  disabled = false,
}: LedSpecAttributesEditorProps) {
  const handleAddRow = () => {
    onChange([...attributes, { label: "", value: "" }]);
  };

  const handleUpdateRow = (
    index: number,
    field: "label" | "value",
    val: string,
  ) => {
    onChange(
      attributes.map((row, idx) =>
        idx === index ? { ...row, [field]: val } : row,
      ),
    );
  };

  const handleRemoveRow = (index: number) => {
    onChange(attributes.filter((_, idx) => idx !== index));
  };

  const handleMoveRow = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= attributes.length) return;
    const next = [...attributes];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3 border-2 border-black bg-[#f3faf5] p-3.5 shadow-[2px_2px_0_0_#000]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2.5">
        <div>
          <span className="block text-xs font-black uppercase tracking-wider text-black">
            Thông số kỹ thuật (có thứ tự)
          </span>
          <span className="text-[11px] font-medium text-text-muted">
            Thêm, sửa, xóa hoặc đổi thứ tự hiển thị các thông số kỹ thuật của mẫu LED.
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddRow}
          className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
        >
          <Plus size={13} aria-hidden="true" />
          Thêm thông số
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="border-2 border-dashed border-black/30 bg-white px-3 py-4 text-center text-xs font-medium text-text-muted">
          Chưa có thông số bổ sung. Bấm &quot;Thêm thông số&quot; để khai báo (ví dụ: Điện áp, Khoảng cách điểm ảnh, Kết nối...).
        </div>
      ) : (
        <div className="space-y-2">
          {attributes.map((attr, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 gap-2 border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000] sm:grid-cols-[1fr_1.4fr_auto]"
            >
              <input
                type="text"
                maxLength={100}
                disabled={disabled}
                value={attr.label}
                onChange={(e) => handleUpdateRow(idx, "label", e.target.value)}
                placeholder="Tên thông số (vd: Điện áp)"
                aria-label={`Tên thông số dòng ${idx + 1}`}
                className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
              />
              <input
                type="text"
                maxLength={500}
                disabled={disabled}
                value={attr.value}
                onChange={(e) => handleUpdateRow(idx, "value", e.target.value)}
                placeholder="Giá trị (vd: 5V USB-C)"
                aria-label={`Giá trị thông số dòng ${idx + 1}`}
                className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
              />
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() => handleMoveRow(idx, -1)}
                  title="Di chuyển lên"
                  aria-label={`Di chuyển thông số dòng ${idx + 1} lên`}
                  className="grid h-8 w-8 cursor-pointer place-items-center border-2 border-black bg-white text-black transition-colors hover:bg-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowUp size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === attributes.length - 1}
                  onClick={() => handleMoveRow(idx, 1)}
                  title="Di chuyển xuống"
                  aria-label={`Di chuyển thông số dòng ${idx + 1} xuống`}
                  className="grid h-8 w-8 cursor-pointer place-items-center border-2 border-black bg-white text-black transition-colors hover:bg-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowDown size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemoveRow(idx)}
                  title="Xóa dòng"
                  aria-label={`Xóa thông số dòng ${idx + 1}`}
                  className="grid h-8 w-8 cursor-pointer place-items-center border-2 border-black bg-white text-red-700 transition-colors hover:bg-[#fecaca] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
