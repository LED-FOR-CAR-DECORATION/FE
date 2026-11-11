"use client";

import React, { useState } from "react";
import { Plus, RotateCcw, Settings2, Trash2, CheckCircle2 } from "lucide-react";
import {
  commissionConfigs as defaultCommissionConfigs,
  type CommissionFieldConfig,
  type CommissionFieldRenderType,
} from "@/features/commission/config/commissionConfigs";
import { useCommissionConfigs } from "@/features/commission/hooks/useCommissionConfigs";

const formatVND = (val: number | null) =>
  val === null ? "Báo giá riêng" : `${val.toLocaleString("vi-VN")}đ`;

export default function CommissionPricingConfigPage() {
  const { configs, updateConfigs } = useCommissionConfigs();
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDesc, setNewFieldDesc] = useState("");
  const [newRenderType, setNewRenderType] =
    useState<CommissionFieldRenderType>("select");
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    const slug = `custom_${Date.now()}`;
    const newField: CommissionFieldConfig = {
      id: `cfg-${slug}`,
      key: slug,
      fieldName: newFieldName.trim(),
      description: newFieldDesc.trim() || "Tiêu chí tùy chỉnh do Manager cấu hình",
      renderType: newRenderType,
      required: true,
      options: [
        {
          id: `opt-${slug}-1`,
          value: "standard",
          label: "Mức tiêu chuẩn",
          price: 0,
        },
        {
          id: `opt-${slug}-2`,
          value: "premium",
          label: "Mức nâng cao",
          price: 200000,
        },
      ],
    };

    updateConfigs([...configs, newField]);
    setNewFieldName("");
    setNewFieldDesc("");
    showNotice(
      `Đã thêm trường "${newField.fieldName}" vào commissionConfigs! Form của Customer và Staff đã tự động cập nhật.`
    );
  };

  const handleRemoveField = (id: string, name: string) => {
    updateConfigs(configs.filter((f) => f.id !== id));
    showNotice(`Đã xóa trường "${name}" khỏi cấu hình!`);
  };

  const handleToggleRenderType = (id: string) => {
    updateConfigs(
      configs.map((f) =>
        f.id === id
          ? { ...f, renderType: f.renderType === "radio" ? "select" : "radio" }
          : f
      )
    );
    showNotice("Đã chuyển đổi kiểu hiển thị (Select / RadioGroup)!");
  };

  const handleResetDefaults = () => {
    updateConfigs(defaultCommissionConfigs);
    showNotice("Đã khôi phục cấu hình commissionConfigs mặc định!");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10 text-[#26352f]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dce8df] pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#198653] uppercase">
            <Settings2 size={15} /> Quản trị Data-Driven Commission Form
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#155e59]">
            Cấu hình tiêu chí & Bảng giá Commission (commissionConfigs)
          </h1>
          <p className="mt-1 text-sm text-[#66736b]">
            Khi thêm/bớt trường hoặc đổi kiểu hiển thị tại đây, cả{" "}
            <strong>Form Yêu cầu Commission (Customer)</strong> và{" "}
            <strong>Form Báo Giá (Staff)</strong> sẽ tự động render thích ứng qua hàm{" "}
            <code className="rounded bg-[#eaf5e8] px-1.5 py-0.5 font-mono text-xs font-bold text-[#155e59]">
              commissionConfigs.map()
            </code>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-2 rounded-xl border border-[#155e59] bg-white px-4 py-2 text-xs font-bold text-[#155e59] shadow-xs hover:bg-[#eaf5e8]"
        >
          <RotateCcw size={14} />
          Khôi phục mặc định
        </button>
      </header>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Form thêm trường cấu hình mới */}
      <form
        onSubmit={handleAddField}
        className="grid gap-3 rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] p-4 shadow-sm sm:grid-cols-4"
      >
        <div>
          <label className="block text-xs font-black text-[#155e59]">
            Tên trường mới
          </label>
          <input
            type="text"
            required
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="VD: Hiệu ứng viền LED..."
            className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs outline-none focus:border-[#155e59]"
          />
        </div>
        <div>
          <label className="block text-xs font-black text-[#155e59]">Mô tả ngắn</label>
          <input
            type="text"
            value={newFieldDesc}
            onChange={(e) => setNewFieldDesc(e.target.value)}
            placeholder="Mô tả hướng dẫn cho khách/staff..."
            className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs outline-none focus:border-[#155e59]"
          />
        </div>
        <div>
          <label className="block text-xs font-black text-[#155e59]">
            Kiểu Render UI
          </label>
          <select
            value={newRenderType}
            onChange={(e) =>
              setNewRenderType(e.target.value as CommissionFieldRenderType)
            }
            className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#155e59]"
          >
            <option value="select">Thẻ &lt;select&gt; (Dropdown)</option>
            <option value="radio">Thẻ &lt;RadioGroup&gt;</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#155e59] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0f4743]"
          >
            <Plus size={15} />
            Thêm Trường Vào Config
          </button>
        </div>
      </form>

      {/* Danh sách các trường trong commissionConfigs */}
      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((field, idx) => (
          <div
            key={field.id}
            className="rounded-xl border border-[#dce8df] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#eef3ef] pb-3">
              <div>
                <span className="text-xs font-black text-[#155e59]">
                  {String(idx + 1).padStart(2, "0")}. {field.fieldName}
                </span>
                <p className="mt-0.5 text-xs text-[#66736b]">{field.description}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleRenderType(field.id)}
                  className="rounded-lg border border-[#8fc7a0] bg-[#eaf5e8] px-2.5 py-1 text-[10px] font-black text-[#155e59] hover:bg-[#dcebd4]"
                  title="Đổi kiểu Render giữa <select> và <RadioGroup>"
                >
                  Kiểu: {field.renderType === "radio" ? "RadioGroup" : "Select"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveField(field.id, field.fieldName)}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                  title="Xóa trường này"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {field.options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between rounded-lg bg-[#f8f7ef] px-3 py-1.5 text-xs"
                >
                  <span className="font-semibold text-[#26352f]">{opt.label}</span>
                  <strong className="text-[#155e59]">{formatVND(opt.price)}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

