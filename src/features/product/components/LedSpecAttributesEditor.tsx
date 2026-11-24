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
    <div className="space-y-2.5 rounded-xl border border-[#dbece0] bg-[#f9fdfa] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="block text-xs font-black uppercase tracking-wider text-[#1f432b]">
            Thông số kỹ thuật (có thứ tự)
          </span>
          <span className="text-[11px] text-text-muted">
            Thêm, sửa, xóa hoặc đổi thứ tự hiển thị các thông số kỹ thuật của mẫu LED.
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddRow}
          className="inline-flex items-center gap-1 rounded-md border border-[#3f9660] bg-white px-2.5 py-1 text-xs font-bold text-[#1f432b] transition hover:bg-[#eaf7ee] disabled:opacity-50"
        >
          <Plus size={13} />
          Thêm thông số
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cfe0d4] bg-white py-4 text-center text-xs text-text-muted">
          Chưa có thông số bổ sung. Bấm &quot;Thêm thông số&quot; để khai báo (ví dụ: Điện áp, Khoảng cách điểm ảnh, Kết nối...).
        </div>
      ) : (
        <div className="space-y-2">
          {attributes.map((attr, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 gap-2 rounded-lg border border-[#e3efe6] bg-white p-2 sm:grid-cols-[1fr_1.4fr_auto]"
            >
              <input
                type="text"
                maxLength={100}
                disabled={disabled}
                value={attr.label}
                onChange={(e) => handleUpdateRow(idx, "label", e.target.value)}
                placeholder="Tên thông số (vd: Điện áp)"
                className="w-full rounded-md border border-[#d8e6dc] px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#439660] disabled:bg-gray-50"
              />
              <input
                type="text"
                maxLength={500}
                disabled={disabled}
                value={attr.value}
                onChange={(e) => handleUpdateRow(idx, "value", e.target.value)}
                placeholder="Giá trị (vd: 5V USB-C)"
                className="w-full rounded-md border border-[#d8e6dc] px-2.5 py-1.5 text-xs outline-none focus:border-[#439660] disabled:bg-gray-50"
              />
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() => handleMoveRow(idx, -1)}
                  title="Di chuyển lên"
                  className="rounded border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-35"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === attributes.length - 1}
                  onClick={() => handleMoveRow(idx, 1)}
                  title="Di chuyển xuống"
                  className="rounded border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-35"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemoveRow(idx)}
                  title="Xóa dòng"
                  className="rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-35"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
