"use client";

import React from "react";
import { Check } from "lucide-react";
import type { CommissionFieldConfig } from "../config/commissionConfigs";

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

interface DynamicCommissionFormFieldsProps {
  /** Mảng cấu hình các trường truyền vào (mặc định lấy từ commissionConfigs) */
  configs: CommissionFieldConfig[];
  /** Object lưu trữ giá trị đã chọn của từng trường theo key */
  selections: Record<string, string | undefined>;
  /** Callback khi người dùng chọn một option trong <select> hoặc <RadioGroup> */
  onSelectChange: (fieldKey: string, optionValue: string) => void;
  /** Chế độ hiển thị thu gọn (dùng trong Panel/Modal Báo Giá của Staff hoặc Chat) */
  compact?: boolean;
}

/**
 * Component Data-Driven Form Rendering:
 * TUYỆT ĐỐI KHÔNG hardcode tên trường (như Độ phức tạp, Loại hoạt ảnh...).
 * Sử dụng `configs.map()` để tự động sinh ra (Dynamic Render) các thẻ `<select>`
 * hoặc `<RadioGroup>` tùy theo cấu hình `field.renderType` từ Backend/Manager.
 */
export default function DynamicCommissionFormFields({
  configs,
  selections,
  onSelectChange,
  compact = false,
}: DynamicCommissionFormFieldsProps) {
  return (
    <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
      {configs.map((field, index) => {
        const selectedValue = selections[field.key] ?? "";
        const isFullWidth = !compact && field.renderType === "radio";

        return (
          <div
            key={field.id}
            className={`rounded-xl border border-[#dce8df] bg-white shadow-sm transition ${
              compact ? "p-3" : "p-4"
            } ${isFullWidth ? "sm:col-span-2" : ""}`}
          >
            {/* Header của Trường cấu hình */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-black text-[#155e59]">
                  {String(index + 1).padStart(2, "0")}. {field.fieldName}
                  {field.required && <span className="ml-1 text-red-600">*</span>}
                </span>
                {field.description && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#66736b]">
                    {field.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-[#eaf5e8] px-2 py-0.5 text-[10px] font-bold text-[#155e59]">
                {field.renderType === "radio" ? "RadioGroup" : "Select"}
              </span>
            </div>

            {/* DYNAMIC RENDERING: <RadioGroup> hoặc <select> dựa trên field.renderType */}
            {field.renderType === "radio" ? (
              <div
                role="radiogroup"
                aria-label={field.fieldName}
                className={`mt-3 grid gap-2 ${
                  compact
                    ? "grid-cols-1"
                    : field.options.length >= 3
                    ? "sm:grid-cols-3"
                    : "sm:grid-cols-2"
                }`}
              >
                {field.options.map((option) => {
                  const isChecked = selectedValue === option.value;
                  const priceLabel =
                    option.price === null
                      ? "Báo giá riêng"
                      : option.price === 0
                      ? "Miễn phí (+0đ)"
                      : `+${formatMoney(option.price)}`;

                  return (
                    <label
                      key={option.id}
                      className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                        isChecked
                          ? "border-[#155e59] bg-[#eaf5e8] shadow-xs ring-1 ring-[#155e59]"
                          : "border-[#dce8df] bg-[#fbfaf5] hover:border-[#8fc7a0] hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`commission-field-${field.key}`}
                        value={option.value}
                        checked={isChecked}
                        required={field.required}
                        onChange={() => onSelectChange(field.key, option.value)}
                        className="sr-only"
                      />
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isChecked
                            ? "border-[#155e59] bg-[#155e59] text-white"
                            : "border-[#9ab5a3] bg-white"
                        }`}
                      >
                        {isChecked && <Check size={10} />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-[#155e59]">
                            {option.label}
                          </span>
                          {option.badge && (
                            <span className="rounded-full bg-[#155e59] px-1.5 py-0.2 text-[9px] font-black text-white">
                              {option.badge}
                            </span>
                          )}
                        </span>
                        <span
                          className={`mt-1 block text-[11px] font-extrabold ${
                            option.price && option.price > 0
                              ? "text-[#198653]"
                              : "text-[#66736b]"
                          }`}
                        >
                          {priceLabel}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2.5">
                <select
                  aria-label={field.fieldName}
                  required={field.required}
                  value={selectedValue}
                  onChange={(e) => onSelectChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-[#cfe3d0] bg-[#fbfaf5] px-3 py-2.5 text-xs font-bold text-[#26352f] outline-none transition focus:border-[#155e59] focus:bg-white focus:ring-2 focus:ring-[#8fc7a0]/40"
                >
                  <option value="">-- Chọn {field.fieldName.toLowerCase()} --</option>
                  {field.options.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}{" "}
                      {option.price === null
                        ? "(Báo giá sau)"
                        : option.price > 0
                        ? `(+${formatMoney(option.price)})`
                        : "(+0đ)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

