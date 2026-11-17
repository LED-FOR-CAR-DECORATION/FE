"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CreatePricingRuleRequest } from "@/api_client/models/CreatePricingRuleRequest";
import type { ManagementCommissionPricingResponse } from "@/api_client/models/ManagementCommissionPricingResponse";
import type { ManagementPricingOptionResponse } from "@/api_client/models/ManagementPricingOptionResponse";
import type { ManagementPricingRuleResponse } from "@/api_client/models/ManagementPricingRuleResponse";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/auth";
import { commissionButton } from "@/features/commission/components/FixedCommissionSteps";
import { formatCommissionMoney } from "@/features/commission/config/fixedPricing";

const endpoint = "/api/management/commissions/pricing";
const panel = "space-y-4 rounded-xl border border-[#cfe3d0] bg-white p-5";
const input = "mt-1 block min-h-11 w-full rounded-lg border border-[#819e8c] bg-white px-3 py-2";
type PricingOption = ManagementPricingOptionResponse & { modifierType?: "FLAT_ADD" | "BASE_PERCENT" | "SUBTOTAL_PERCENT" };
type PricingRule = Omit<ManagementPricingRuleResponse, "selectionType" | "options"> & {
  selectionType?: ManagementPricingRuleResponse["selectionType"] | "QUANTITY";
  minQuantity?: number | null;
  maxQuantity?: number | null;
  options?: PricingOption[];
};
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
      <h2 className="text-lg font-bold text-[#155e59]">Thêm tiêu chí</h2>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block">Tên tiêu chí<input name="name" className={input} required maxLength={255} /></label>
        <label className="block">Hướng dẫn cho khách<textarea name="description" rows={2} className={input} /></label>
        <label className="block">Cách nhập
          <select value={kind} onChange={(event) => setKind(event.target.value === "text" ? "text" : "choice")} className={input}>
            <option value="choice">Chọn một phương án</option>
            <option value="text">Nhập văn bản</option>
          </select>
        </label>
        {kind === "choice" && (
          <fieldset className="space-y-3">
            <legend className="font-semibold">Phương án và phụ phí</legend>
            {optionIds.map((id, index) => (
              <div key={id} className="grid gap-2 rounded-lg bg-[#f4f8f3] p-3 sm:grid-cols-[1fr_1fr]">
                <label className="text-sm">Phương án {index + 1}<input name={"option-" + id} required maxLength={255} className={input} /></label>
                <label className="text-sm">Phụ phí (₫)<input name={"price-" + id} type="number" required min={0} max={999999999} step={1} defaultValue={0} className={input} /></label>
                {optionIds.length > 1 && <button type="button" className="justify-self-start py-2 text-sm text-red-700 underline" onClick={() => setOptionIds((ids) => ids.filter((item) => item !== id))}>Bỏ phương án {index + 1}</button>}
              </div>
            ))}
            <button type="button" className="min-h-11 font-semibold text-[#155e59] underline" onClick={() => setOptionIds((ids) => [...ids, Math.max(...ids) + 1])}>Thêm phương án</button>
          </fieldset>
        )}
        <label className="flex min-h-11 items-center gap-2"><input name="required" type="checkbox" /> Khách bắt buộc nhập</label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className={commissionButton}>{busy ? "Đang lưu…" : "Lưu tiêu chí"}</button>
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
      <h2 className="text-lg font-bold text-[#155e59]">Sửa tiêu chí</h2>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block">Tên tiêu chí<input name="name" className={input} required maxLength={255} defaultValue={rule.configName} autoFocus /></label>
        <label className="block">Hướng dẫn cho khách<textarea name="description" rows={2} className={input} defaultValue={rule.description} /></label>
        {options.map((option, index) => {
          const isPercent = option.modifierType === "BASE_PERCENT" || option.modifierType === "SUBTOTAL_PERCENT";
          const id = option.optionId;
          const removed = removedOptionIds.includes(id);
          return (
            <div key={option.optionId} className="grid gap-2 rounded-lg bg-[#f4f8f3] p-3 sm:grid-cols-2">
              <label className="text-sm">Phương án {index + 1}
                <input name={"option-" + id} required disabled={removed} maxLength={255} className={input} defaultValue={option.optionLabel} />
              </label>
              <label className="text-sm">
                {isPercent ? "Phụ phí (%)" : rule.selectionType === "QUANTITY" ? "Đơn giá (₫)" : "Phụ phí (₫)"}
                <input name={"price-" + id} type="number" required disabled={removed} min={0} max={isPercent ? 1000 : 9999999999.99}
                  step={0.01} className={input} defaultValue={option.basePrice} />
              </label>
              {canRemoveOptions && (
                <button type="button" className="min-h-11 justify-self-start text-sm text-red-700 underline sm:col-span-2"
                  onClick={() => setRemovedOptionIds((ids) => removed ? ids.filter((item) => item !== id) : [...ids, id])}>
                  {removed ? "Giữ lại phương án" : "Xóa phương án"} {index + 1}
                </button>
              )}
            </div>
          );
        })}
        {newOptionIds.map((id, index) => (
          <fieldset key={id} className="grid gap-2 rounded-lg bg-[#f4f8f3] p-3 sm:grid-cols-2">
            <legend className="text-sm font-semibold">Phương án mới {index + 1}</legend>
            <label className="text-sm">Tên phương án
              <input name={"new-option-" + id} required maxLength={255} className={input} placeholder={isMatrixSize ? "Ví dụ 32 × 64" : undefined} />
            </label>
            <label className="text-sm">Phụ phí (₫)
              <input name={"new-price-" + id} type="number" required min={0} max={9999999999.99} step={0.01} className={input} defaultValue={0} />
            </label>
            <button type="button" className="min-h-11 justify-self-start text-sm text-red-700 underline sm:col-span-2"
              onClick={() => setNewOptionIds((ids) => ids.filter((item) => item !== id))}>
              Bỏ phương án mới {index + 1}
            </button>
          </fieldset>
        ))}
        {canAddOptions && (
          <button type="button" disabled={newOptionIds.length >= 50} className="min-h-11 font-semibold text-[#155e59] underline disabled:opacity-50"
            onClick={() => setNewOptionIds((ids) => [...ids, crypto.randomUUID()])}>
            Thêm phương án
          </button>
        )}
        {rule.isSystem ? (
          <p className="text-sm text-[#526159]">Thiết lập bắt buộc của tiêu chí mặc định được giữ theo quy tắc hệ thống.</p>
        ) : (
          <label className="flex min-h-11 items-center gap-2"><input name="required" type="checkbox" defaultChecked={rule.isRequired} /> Khách bắt buộc nhập</label>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={confirmDelete} className={commissionButton}>{busy ? "Đang xử lý…" : "Lưu thay đổi"}</button>
          <button type="button" className="min-h-11 px-3 text-[#155e59] underline" onClick={onCancel}>Hủy</button>
        </div>
        {!rule.isSystem && (
          confirmDelete ? (
            <div className="space-y-2 rounded-lg border border-red-200 p-3">
              <p>Xóa tiêu chí “{rule.configName}” khỏi form khách hàng?</p>
              <button type="button" className="min-h-11 font-semibold text-red-700 underline" onClick={() => void deleteRule()}>Xác nhận xóa tiêu chí</button>
              <button type="button" className="ml-3 min-h-11 underline" onClick={() => setConfirmDelete(false)}>Quay lại</button>
            </div>
          ) : (
            <button type="button" className="min-h-11 font-semibold text-red-700 underline" onClick={() => setConfirmDelete(true)}>Xóa tiêu chí</button>
          )
        )}
      </fieldset>
    </form>
  );
}

export default function CommissionPricingConfigPage() {
  const [pricing, setPricing] = useState<Pricing>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [editingId, setEditingId] = useState<number>();
  const activeRules = (pricing?.rules ?? []).filter((rule) => rule.isActive !== false);
  const editing = activeRules.find((rule) => editingId !== undefined && rule.configId === editingId);

  useEffect(() => {
    let active = true;
    loadPricing().then((data) => { if (active) setPricing(data); }).catch((failure) => {
      if (active) setError(getApiErrorMessage(failure, "Không tải được cấu hình giá Commission."));
    });
    return () => { active = false; };
  }, [loadAttempt]);

  return (
    <main className="mx-auto max-w-6xl space-y-5 pb-10 text-[#26352f]">
      <header>
        <h1 className="text-3xl font-black text-[#155e59]">Tiêu chí và bảng giá Commission</h1>
        <p className="mt-2 text-sm text-[#526159]">Thêm và sửa tiêu chí thiết kế trên form khách hàng.</p>
      </header>
      {error ? (
        <div className={panel}>
          <p role="alert">{error}</p>
          <button className={commissionButton} onClick={() => { setError(""); setLoadAttempt((current) => current + 1); }}>Tải lại</button>
        </div>
      ) : !pricing ? <p role="status">Đang tải cấu hình Commission…</p> : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div className="min-w-0 space-y-5">
            {pricing.tiers.length > 0 && <section className={panel}>
              <h2 className="text-lg font-bold text-[#155e59]">Gói thiết kế</h2>
              <ul className="divide-y divide-[#dce8df]">
                {pricing.tiers.map((tier) => (
                  <li key={tier.tierId} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{tier.tierName}{tier.isActive === false && <small className="ml-2 text-[#526159]">Đang ẩn</small>}</span>
                    <strong>{tier.isCustom ? "Tính theo lựa chọn" : tier.basePrice != null ? formatCommissionMoney(tier.basePrice) : "—"}</strong>
                  </li>
                ))}
              </ul>
            </section>}
            <section className={panel}>
              <h2 className="text-lg font-bold text-[#155e59]">Tiêu chí thiết kế</h2>
              {!activeRules.length && <p>Chưa có tiêu chí thiết kế.</p>}
              {activeRules.map((rule) => (
                <details key={rule.configId} open={rule.isSystem || undefined} className="rounded-lg border border-[#cfe3d0] bg-[#f4f8f3] px-3">
                  <summary className="cursor-pointer py-3 font-semibold text-[#155e59]">
                    {rule.configName}
                  </summary>
                  <div className="space-y-2 pb-3 text-sm">
                    {rule.description && <p>{rule.description}</p>}
                    <p>{rule.isRequired ? "Bắt buộc" : "Tùy chọn"}{rule.dependsOnOptionCode && ` · Hiện khi chọn ${rule.dependsOnOptionCode}`}</p>
                    {rule.selectionType === "QUANTITY" && <p>Số lượng từ {rule.minQuantity ?? 0}{rule.maxQuantity != null && ` đến ${rule.maxQuantity}`}</p>}
                    <ul className="divide-y divide-[#dce8df]">
                      {(rule.options ?? []).filter((option) => option.isActive !== false).map((option) => (
                        <li key={option.optionId} className="flex flex-wrap justify-between gap-2 py-2">
                          <span>{option.optionLabel}</span>
                          <strong>{optionPrice(option, rule)}</strong>
                        </li>
                      ))}
                    </ul>
                    {rule.configId !== undefined && (
                      <button type="button" aria-label={`Sửa tiêu chí ${rule.configName}`} className="min-h-11 font-semibold text-[#155e59] underline"
                        onClick={() => { setEditingId(rule.configId); setNotice(""); }}>
                        Sửa tiêu chí
                      </button>
                    )}
                  </div>
                </details>
              ))}
            </section>
          </div>
          <div className="space-y-3">
            {notice && <p role="status" className="rounded-lg bg-[#eaf5e8] p-3 text-[#155e59]">{notice}</p>}
            {editing ? <EditCriterion key={editingId} rule={editing} onCancel={() => setEditingId(undefined)} onDeleted={() => {
              setPricing((current) => current && { ...current, rules: current.rules.filter((item) => item.configId !== editingId) });
              setEditingId(undefined);
              setNotice(`Đã xóa tiêu chí “${editing.configName}”.`);
            }} onSaved={(rule) => {
              setPricing((current) => current && { ...current, rules: current.rules.map((item) => item.configId === rule.configId ? rule : item) });
              setEditingId(undefined);
              setNotice(`Đã cập nhật tiêu chí “${rule.configName}”.`);
            }} /> : <AddCriterion onCreated={(rule) => {
              setPricing((current) => current && { ...current, rules: [...current.rules, rule] });
              setNotice(`Đã lưu tiêu chí “${rule.configName}”.`);
            }} />}
          </div>
        </div>
      )}
    </main>
  );
}
