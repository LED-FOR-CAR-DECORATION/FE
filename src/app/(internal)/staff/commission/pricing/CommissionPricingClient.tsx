"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit2,
  Layers,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { CreatePricingRuleRequest } from "@/api_client/models/CreatePricingRuleRequest";
import type { ManagementCommissionPricingResponse } from "@/api_client/models/ManagementCommissionPricingResponse";
import type { ManagementPricingOptionResponse } from "@/api_client/models/ManagementPricingOptionResponse";
import type { ManagementPricingRuleResponse } from "@/api_client/models/ManagementPricingRuleResponse";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/auth";
import { formatCommissionMoney } from "@/features/commission/config/fixedPricing";
import CommissionPresetEditor from "@/features/commission/components/CommissionPresetEditor";

const endpoint = "/api/management/commissions/pricing";
const panel = "border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6";
const input =
  "mt-1.5 block w-full border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black placeholder:text-text-muted focus:bg-white disabled:cursor-not-allowed disabled:opacity-60";
const fieldLabel = "block text-[11px] font-black uppercase tracking-wider text-black";
const primaryButton =
  "btn-primary inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]";
const secondaryButton =
  "btn-secondary inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]";
const dangerButton =
  "btn-danger inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]";
type PricingOption = ManagementPricingOptionResponse;
type PricingRule = ManagementPricingRuleResponse;
type Pricing = { tiers: NonNullable<ManagementCommissionPricingResponse["tiers"]>; rules: PricingRule[] };

function optionPrice(option: PricingOption, rule: PricingRule) {
  if (option.basePrice == null) return "—";
  if (option.modifierType === "BASE_PERCENT") return `${option.basePrice.toLocaleString("vi-VN")}% giá cơ bản`;
  if (option.modifierType === "SUBTOTAL_PERCENT") return `${option.basePrice.toLocaleString("vi-VN")}% tạm tính`;
  const price = formatCommissionMoney(option.basePrice);
  return rule.selectionType === "QUANTITY" ? price + " / đơn vị" : price;
}

async function loadPricing(): Promise<Pricing> {
  const { data } = await request<{ data: ManagementCommissionPricingResponse }>(OpenAPI, { method: "GET", url: endpoint });
  const rules = await Promise.all((data.rules ?? []).flatMap(({ configId }) => configId === undefined ? [] : [
    request<{ data: PricingRule }>(OpenAPI, { method: "GET", url: endpoint + "/rules/{id}", path: { id: configId } })
      .then((response) => response.data),
  ]));
  return { tiers: data.tiers ?? [], rules };
}

function AddCriterion({ onCreated }: { onCreated: (rule: ManagementPricingRuleResponse) => void }) {
  const [optionIds, setOptionIds] = useState([1]);
  const [kind, setKind] = useState<"choice" | "text">("choice");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addCriterion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (key: string) => String(fields.get(key) ?? "").trim();
    const configName = value("name");
    const options = kind === "text" ? [] : optionIds.map((id, index) => ({
      optionCode: "OPTION_" + id,
      optionLabel: value("option-" + id),
      basePrice: Number(value("price-" + id)),
      displayOrder: index + 1,
    }));
    if (!configName || options.some((option) => !option.optionLabel || !Number.isSafeInteger(option.basePrice) || option.basePrice < 0)) {
      setError("Nhập tên tiêu chí, tên lựa chọn và phụ phí hợp lệ.");
      return;
    }

    const body: CreatePricingRuleRequest = {
      configCode: "CUSTOM_" + crypto.randomUUID().replaceAll("-", "").toUpperCase(),
      configName,
      description: value("description"),
      isRequired: fields.has("required"),
      selectionType: kind === "text" ? CreatePricingRuleRequest.selectionType.TEXT_INPUT : CreatePricingRuleRequest.selectionType.SINGLE_SELECT,
      uiType: kind === "text" ? CreatePricingRuleRequest.uiType.TEXT : CreatePricingRuleRequest.uiType.DROPDOWN,
      options,
    };

    setBusy(true);
    setError("");
    try {
      const { data } = await request<{ data: ManagementPricingRuleResponse }>(OpenAPI, {
        method: "POST", url: endpoint + "/rules", mediaType: "application/json", body,
      });
      onCreated(data);
      form.reset();
      setKind("choice");
      setOptionIds([1]);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Không lưu được tiêu chí. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={addCriterion} className={panel}>
      <div className="flex items-start gap-2.5 border-b-2 border-black pb-4">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
          <Plus className="h-4 w-4 text-black" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
            Thêm tiêu chí
          </h2>
          <p className="mt-0.5 text-xs font-medium text-text-muted">
            Tạo tiêu chí mới và thiết lập các phương án kèm phụ phí.
          </p>
        </div>
      </div>

      <fieldset disabled={busy} className="mt-4 space-y-4">
        <label className={fieldLabel}>
          Tên tiêu chí
          <input name="name" className={input} required maxLength={255} />
        </label>
        <label className={fieldLabel}>
          Hướng dẫn cho khách
          <textarea name="description" rows={2} className={input} />
        </label>
        <label className={fieldLabel}>
          Cách nhập
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value === "text" ? "text" : "choice")}
            className={input}
          >
            <option value="choice">Chọn một phương án</option>
            <option value="text">Nhập văn bản</option>
          </select>
        </label>
        {kind === "choice" && (
          <fieldset className="space-y-3 border-t-2 border-dashed border-gray-200 pt-4">
            <legend className="text-[11px] font-black uppercase tracking-wider text-black">
              Phương án và phụ phí
            </legend>
            {optionIds.map((id, index) => (
              <div
                key={id}
                className="grid gap-3 border-2 border-black bg-gray-50 p-3.5 sm:grid-cols-[1fr_1fr]"
              >
                <label className={fieldLabel}>
                  Phương án {index + 1}
                  <input name={"option-" + id} required maxLength={255} className={input} />
                </label>
                <label className={fieldLabel}>
                  Phụ phí (VNĐ)
                  <input
                    name={"price-" + id}
                    type="number"
                    required
                    min={0}
                    max={999999999}
                    step={1}
                    defaultValue={0}
                    className={`${input} tabular-nums`}
                  />
                </label>
                {optionIds.length > 1 && (
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 justify-self-start border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-700 shadow-[1px_1px_0_0_#000] transition-colors hover:bg-[#fee2e2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:col-span-2"
                    onClick={() => setOptionIds((ids) => ids.filter((item) => item !== id))}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Bỏ phương án {index + 1}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setOptionIds((ids) => [...ids, Math.max(...ids) + 1])}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Thêm phương án
            </button>
          </fieldset>
        )}
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-[#f3faf5]">
          <input
            name="required"
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-primary-ink"
          />
          Khách bắt buộc nhập
        </label>
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        <div className="border-t-2 border-dashed border-gray-200 pt-4">
          <button type="submit" className={`${primaryButton} w-full`}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {busy ? "Đang lưu…" : "Lưu tiêu chí"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function EditCriterion({ rule, onSaved, onCancel, onDeleted }: {
  rule: PricingRule;
  onSaved: (rule: PricingRule) => void;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newOptionIds, setNewOptionIds] = useState<string[]>([]);
  const [removedOptionIds, setRemovedOptionIds] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const options = (rule.options ?? []).filter((option): option is PricingOption & { optionId: number } =>
    option.optionId !== undefined && option.isActive !== false);
  const canRemoveOptions = rule.configCode !== "FORMAT_TYPE" && rule.selectionType !== "QUANTITY";
  const isMatrixSize = rule.configCode === "MATRIX_SIZE";
  const canAddOptions = rule.configCode !== "FORMAT_TYPE" &&
    (rule.selectionType === "SINGLE_SELECT" || rule.selectionType === "MULTI_SELECT");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmDelete) return;
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? "").trim();
    const configName = value("name");
    const updatedOptions = options.filter(({ optionId }) => !removedOptionIds.includes(optionId)).map(({ optionId }) => ({
      optionId,
      optionLabel: value("option-" + optionId),
      basePrice: Number(value("price-" + optionId)),
    }));
    const newOptions = newOptionIds.map((id) => {
      const optionLabel = value("new-option-" + id);
      const size = isMatrixSize
        ? /^([1-9][0-9]{0,3})\s*[xX×]\s*([1-9][0-9]{0,3})(?=\s|$)/.exec(optionLabel)
        : null;
      return {
        optionLabel,
        basePrice: Number(value("new-price-" + id)),
        ...(size && { matrixDimensions: `${size[1]}x${size[2]}` }),
      };
    });
    if (!configName || [...updatedOptions, ...newOptions].some(({ optionLabel }) => !optionLabel)) {
      setError("Tên tiêu chí và tên phương án không được để trống.");
      return;
    }
    if (isMatrixSize && newOptions.some(({ matrixDimensions }) => !matrixDimensions)) {
      setError("Tên phương án kích thước LED phải bắt đầu bằng kích thước, ví dụ 32 × 64.");
      return;
    }
    if (removedOptionIds.length > 0 && updatedOptions.length + newOptions.length === 0) {
      setError("Tiêu chí phải còn ít nhất một phương án.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { data } = await request<{ data: PricingRule }>(OpenAPI, {
        method: "PATCH",
        url: endpoint + "/rules/{id}",
        path: { id: rule.configId },
        mediaType: "application/json",
        body: {
          configName,
          description: value("description"),
          isRequired: rule.isSystem ? Boolean(rule.isRequired) : fields.has("required"),
          options: updatedOptions,
          newOptions,
          removedOptionIds,
        },
      });
      onSaved(data);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Không lưu được thay đổi. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule() {
    setBusy(true);
    setError("");
    try {
      await request(OpenAPI, { method: "DELETE", url: endpoint + "/rules/{id}", path: { id: rule.configId } });
      onDeleted();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Không xóa được tiêu chí."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className={panel}>
      <div className="flex items-start gap-2.5 border-b-2 border-black pb-4">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-[#fef08a] shadow-[2px_2px_0_0_#000]">
          <Edit2 className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
            Sửa tiêu chí
          </h2>
          <p className="mt-0.5 truncate text-xs font-medium text-text-muted">
            Đang chỉnh sửa: <strong className="font-black text-black">{rule.configName}</strong>
          </p>
        </div>
      </div>

      <fieldset disabled={busy} className="mt-4 space-y-4">
        <label className={fieldLabel}>
          Tên tiêu chí
          <input
            name="name"
            className={input}
            required
            maxLength={255}
            defaultValue={rule.configName}
            autoFocus
          />
        </label>
        <label className={fieldLabel}>
          Hướng dẫn cho khách
          <textarea
            name="description"
            rows={2}
            className={input}
            defaultValue={rule.description}
          />
        </label>
        {options.map((option, index) => {
          const isPercent = option.modifierType === "BASE_PERCENT" || option.modifierType === "SUBTOTAL_PERCENT";
          const id = option.optionId;
          const removed = removedOptionIds.includes(id);
          return (
            <div
              key={option.optionId}
              className={`grid gap-3 border-2 p-3.5 sm:grid-cols-2 ${
                removed
                  ? "border-dashed border-red-600 bg-[#fee2e2]/40 opacity-80"
                  : "border-black bg-gray-50"
              }`}
            >
              <label className={fieldLabel}>
                Phương án {index + 1}
                <input
                  name={"option-" + id}
                  required
                  disabled={removed}
                  maxLength={255}
                  className={input}
                  defaultValue={option.optionLabel}
                />
              </label>
              <label className={fieldLabel}>
                {isPercent ? "Phụ phí (%)" : rule.selectionType === "QUANTITY" ? "Đơn giá (VNĐ)" : "Phụ phí (VNĐ)"}
                <input
                  name={"price-" + id}
                  type="number"
                  required
                  disabled={removed}
                  min={0}
                  max={isPercent ? 1000 : 9999999999.99}
                  step={0.01}
                  className={`${input} tabular-nums`}
                  defaultValue={option.basePrice}
                />
              </label>
              {canRemoveOptions && (
                <button
                  type="button"
                  className={`inline-flex cursor-pointer items-center gap-1 justify-self-start border border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:col-span-2 ${
                    removed
                      ? "bg-primary text-black hover:bg-primary-dark"
                      : "bg-white text-red-700 hover:bg-[#fee2e2]"
                  }`}
                  onClick={() =>
                    setRemovedOptionIds((ids) =>
                      removed ? ids.filter((item) => item !== id) : [...ids, id],
                    )
                  }
                >
                  {removed ? "Giữ lại phương án" : "Xóa phương án"} {index + 1}
                </button>
              )}
            </div>
          );
        })}
        {newOptionIds.map((id, index) => (
          <fieldset
            key={id}
            className="grid gap-3 border-2 border-black bg-[#e9f5ed]/60 p-3.5 sm:grid-cols-2"
          >
            <legend className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
              Phương án mới {index + 1}
            </legend>
            <label className={fieldLabel}>
              Tên phương án
              <input
                name={"new-option-" + id}
                required
                maxLength={255}
                className={input}
                placeholder={isMatrixSize ? "Ví dụ 32 × 64" : undefined}
              />
            </label>
            <label className={fieldLabel}>
              Phụ phí (VNĐ)
              <input
                name={"new-price-" + id}
                type="number"
                required
                min={0}
                max={9999999999.99}
                step={0.01}
                className={`${input} tabular-nums`}
                defaultValue={0}
              />
            </label>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 justify-self-start border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-700 shadow-[1px_1px_0_0_#000] transition-colors hover:bg-[#fee2e2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:col-span-2"
              onClick={() => setNewOptionIds((ids) => ids.filter((item) => item !== id))}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Bỏ phương án mới {index + 1}
            </button>
          </fieldset>
        ))}
        {canAddOptions && (
          <button
            type="button"
            disabled={newOptionIds.length >= 50}
            className={secondaryButton}
            onClick={() => setNewOptionIds((ids) => [...ids, crypto.randomUUID()])}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Thêm phương án
          </button>
        )}
        {rule.isSystem ? (
          <p className="border-2 border-dashed border-black/25 bg-gray-50 p-3 text-xs font-medium text-text-muted">
            Thiết lập bắt buộc của tiêu chí mặc định được giữ theo quy tắc hệ thống.
          </p>
        ) : (
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-[#f3faf5]">
            <input
              name="required"
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-primary-ink"
              defaultChecked={rule.isRequired}
            />
            Khách bắt buộc nhập
          </label>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-dashed border-gray-200 pt-4">
          <button type="submit" disabled={confirmDelete} className={primaryButton}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {busy ? "Đang xử lý…" : "Lưu thay đổi"}
          </button>
          <button type="button" className={secondaryButton} onClick={onCancel}>
            Hủy
          </button>
        </div>
        {!rule.isSystem && (
          <div className="border-t-2 border-dashed border-gray-200 pt-4">
            {confirmDelete ? (
              <div className="space-y-3 border-2 border-black bg-[#fee2e2] p-4 shadow-[4px_4px_0_0_#000]">
                <p className="text-xs font-bold text-black">
                  Xóa tiêu chí “{rule.configName}” khỏi form khách hàng?
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className={dangerButton}
                    onClick={() => void deleteRule()}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Xác nhận xóa tiêu chí
                  </button>
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={dangerButton}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Xóa tiêu chí
              </button>
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}

/** BE chưa trả `options` trong danh sách rule (docs: API #22) nên vẫn phải gọi chi tiết từng rule; cache 60s. */
const PRICING_KEY = ["commission-pricing", "management"] as const;

export default function CommissionPricingConfigPage() {
  const queryClient = useQueryClient();
  const [pricing, setPricingState] = useState<Pricing>();
  // Mọi thay đổi cục bộ sau khi tạo/sửa/xoá rule cũng đánh dấu cache cũ để lần mở trang sau tải lại.
  const setPricing: typeof setPricingState = (next) => {
    setPricingState(next);
    void queryClient.invalidateQueries({ queryKey: PRICING_KEY, refetchType: "none" });
  };
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [editingId, setEditingId] = useState<number>();
  const activeRules = (pricing?.rules ?? []).filter((rule) => rule.isActive !== false);
  const editing = activeRules.find((rule) => editingId !== undefined && rule.configId === editingId);

  useEffect(() => {
    let active = true;
    queryClient
      .fetchQuery({ queryKey: PRICING_KEY, queryFn: loadPricing, staleTime: loadAttempt > 0 ? 0 : 60_000 })
      .then((data) => { if (active) setPricingState(data); }).catch((failure) => {
      if (active) setError(getApiErrorMessage(failure, "Không tải được cấu hình giá Commission."));
    });
    return () => { active = false; };
  }, [loadAttempt, queryClient]);

  return (
    <main className="manager-neo-dashboard mx-auto w-full max-w-[1440px] pb-10 font-sans text-text-main">
      <div className="flex flex-col gap-6">
        {/* Top Header Banner */}
        <header className="border-2 border-black border-l-8 border-l-primary bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  CẤU HÌNH BẢNG GIÁ
                </span>
                <nav
                  aria-label="Đường dẫn"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                >
                  <span>Quản lý</span>
                  <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                  <span>Yêu cầu thiết kế</span>
                  <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                  <span className="text-black">Cấu hình giá</span>
                </nav>
              </div>

              <div className="flex items-center gap-2.5">
                <SlidersHorizontal
                  size={24}
                  className="shrink-0 text-primary-ink"
                  aria-hidden="true"
                />
                <h1 className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
                  Tiêu chí và bảng giá Commission
                </h1>
              </div>

              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Thêm và sửa tiêu chí thiết kế, phụ phí và gói thiết kế trên form khách hàng.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLoadAttempt((current) => current + 1);
                }}
                className={secondaryButton}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Làm mới
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] px-5 py-4 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <span className="inline-flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setError("");
                setLoadAttempt((current) => current + 1);
              }}
            >
              Tải lại
            </button>
          </div>
        ) : !pricing ? (
          <div className={panel}>
            <p
              role="status"
              className="flex items-center justify-center gap-2.5 border-2 border-dashed border-black/25 bg-gray-50 p-10 text-xs font-black uppercase tracking-wider text-black"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary-ink" aria-hidden="true" />
              Đang tải cấu hình Commission…
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
            <div className="min-w-0 space-y-6">
              <CommissionPresetEditor
                tiers={pricing.tiers}
                rules={pricing.rules}
                onSaved={() => setLoadAttempt((value) => value + 1)}
              />

              {pricing.tiers.length > 0 && (
                <section aria-label="Gói thiết kế" className={panel}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
                        <Layers className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                            Gói thiết kế
                          </h2>
                          <span className="inline-flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black tabular-nums shadow-[1px_1px_0_0_#000]">
                            {pricing.tiers.length} gói
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-text-muted">
                          Bảng mức giá cơ bản theo từng gói thiết kế đang áp dụng.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto border-2 border-black">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                          <th className="px-4 py-3 text-left">Tên gói</th>
                          <th className="px-4 py-3 text-left">Trạng thái</th>
                          <th className="px-4 py-3 text-right">Giá cơ bản</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-black/10 bg-white">
                        {pricing.tiers.map((tier) => (
                          <tr
                            key={tier.tierId}
                            className="transition-colors duration-150 hover:bg-[#f3faf5]"
                          >
                            <td className="px-4 py-3 font-black uppercase text-black">
                              {tier.tierName}
                              {tier.tierCode && (
                                <span className="ml-2 inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">
                                  {tier.tierCode}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {tier.isActive === false ? (
                                <span className="inline-flex items-center gap-1 border border-black bg-gray-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                                  Đang ẩn
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 border border-black bg-primary/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                                  Đang mở
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-black text-primary-ink tabular-nums">
                              {tier.isCustom
                                ? "Tính theo lựa chọn"
                                : tier.basePrice != null
                                  ? formatCommissionMoney(tier.basePrice)
                                  : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section aria-label="Tiêu chí thiết kế" className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
                      <ListChecks className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                          Tiêu chí thiết kế
                        </h2>
                        <span className="inline-flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black tabular-nums shadow-[1px_1px_0_0_#000]">
                          {activeRules.length} tiêu chí
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-text-muted">
                        Mở từng tiêu chí để xem chi tiết phương án, đơn giá phụ phí và chỉnh sửa.
                      </p>
                    </div>
                  </div>
                </div>

                {!activeRules.length ? (
                  <div className="mt-5 border-2 border-dashed border-black/25 bg-gray-50 px-6 py-10 text-center">
                    <p className="text-xs font-black uppercase tracking-wide text-black">
                      Chưa có tiêu chí thiết kế.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {activeRules.map((rule) => {
                      const activeOptions = (rule.options ?? []).filter(
                        (option) => option.isActive !== false,
                      );
                      return (
                        <details
                          key={rule.configId}
                          open={rule.isSystem || undefined}
                          className="group border-2 border-black bg-white shadow-[2px_2px_0_0_#000]"
                        >
                          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 bg-[#e9f5ed] px-4 py-3 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            <span className="flex flex-wrap items-center gap-2">
                              <span>{rule.configName}</span>
                              <span
                                className={`inline-flex items-center gap-1 border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] ${
                                  rule.isRequired ? "bg-[#fef08a]" : "bg-white"
                                }`}
                              >
                                {rule.isRequired ? "Bắt buộc" : "Tùy chọn"}
                              </span>
                              {rule.isSystem && (
                                <span className="inline-flex items-center gap-1 border border-black bg-primary/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                                  Mặc định
                                </span>
                              )}
                            </span>
                            <ChevronDown
                              className="h-4 w-4 shrink-0 text-black transition-transform duration-150 group-open:rotate-180"
                              aria-hidden="true"
                            />
                          </summary>

                          <div className="space-y-3 border-t-2 border-black bg-white p-4 text-xs">
                            {rule.description && (
                              <p className="font-medium text-text-muted">{rule.description}</p>
                            )}
                            <p className="font-bold text-black">
                              {rule.isRequired ? "Bắt buộc" : "Tùy chọn"}
                              {rule.dependsOnOptionCode &&
                                ` · Hiện khi chọn ${rule.dependsOnOptionCode}`}
                            </p>
                            {rule.selectionType === "QUANTITY" && (
                              <p className="font-bold text-text-muted tabular-nums">
                                Số lượng từ {rule.minQuantity ?? 0}
                                {rule.maxQuantity != null && ` đến ${rule.maxQuantity}`}
                              </p>
                            )}

                            {activeOptions.length > 0 && (
                              <div className="overflow-x-auto border-2 border-black">
                                <table className="w-full border-collapse text-left text-xs">
                                  <thead>
                                    <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                                      <th className="px-3.5 py-2.5 text-left">Phương án</th>
                                      <th className="px-3.5 py-2.5 text-right">Phụ phí / Đơn giá</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y-2 divide-black/10 bg-white">
                                    {activeOptions.map((option) => (
                                      <tr
                                        key={option.optionId}
                                        className="transition-colors duration-150 hover:bg-[#f3faf5]"
                                      >
                                        <td className="px-3.5 py-2.5 font-bold text-black">
                                          {option.optionLabel}
                                        </td>
                                        <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-black text-primary-ink tabular-nums">
                                          {optionPrice(option, rule)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {rule.configId !== undefined && (
                              <div className="flex justify-end border-t-2 border-dashed border-gray-200 pt-3">
                                <button
                                  type="button"
                                  aria-label={`Sửa tiêu chí ${rule.configName}`}
                                  className={secondaryButton}
                                  onClick={() => {
                                    setEditingId(rule.configId);
                                    setNotice("");
                                  }}
                                >
                                  <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Sửa tiêu chí
                                </button>
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-4 lg:sticky lg:top-6">
              {notice && (
                <p
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-2.5 border-2 border-black bg-primary/35 px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink"
                    aria-hidden="true"
                  />
                  <span>{notice}</span>
                </p>
              )}
              {editing ? (
                <EditCriterion
                  key={editingId}
                  rule={editing}
                  onCancel={() => setEditingId(undefined)}
                  onDeleted={() => {
                    setPricing(
                      (current) =>
                        current && {
                          ...current,
                          rules: current.rules.filter((item) => item.configId !== editingId),
                        },
                    );
                    setEditingId(undefined);
                    setNotice(`Đã xóa tiêu chí “${editing.configName}”.`);
                  }}
                  onSaved={(rule) => {
                    setPricing(
                      (current) =>
                        current && {
                          ...current,
                          rules: current.rules.map((item) =>
                            item.configId === rule.configId ? rule : item,
                          ),
                        },
                    );
                    setEditingId(undefined);
                    setNotice(`Đã cập nhật tiêu chí “${rule.configName}”.`);
                  }}
                />
              ) : (
                <AddCriterion
                  onCreated={(rule) => {
                    setPricing(
                      (current) =>
                        current && { ...current, rules: [...current.rules, rule] },
                    );
                    setNotice(`Đã lưu tiêu chí “${rule.configName}”.`);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
