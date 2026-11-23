"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import type { ManagementPricingTierResponse } from "@/api_client/models/ManagementPricingTierResponse";
import type { ManagementPricingRuleResponse } from "@/api_client/models/ManagementPricingRuleResponse";
import { commissionErrorMessage } from "../errors";

const control = "mt-1 block min-h-11 w-full rounded-lg border border-[#819e8c] bg-white px-3 py-2";
const blank: ManagementPricingTierResponse = { tierCode: "", tierName: "", basePrice: 0, maxRevisions: 1, extraRevisionFeePercent: 10, isActive: true, discountPercent: 0, includedOptionIds: [], triggerOptionIds: [] };

export default function CommissionPresetEditor({ tiers, rules, onSaved }: {
  tiers: ManagementPricingTierResponse[]; rules: ManagementPricingRuleResponse[]; onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ManagementPricingTierResponse>(blank);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const custom = draft.tierCode?.toUpperCase() === "CUSTOM";

  useEffect(() => {
    setError("");
    setNotice("");
    if (!selectedId) { setDraft(blank); setLoading(false); return; }
    let active = true;
    setLoading(true);
    const query = request<{ data: ManagementPricingTierResponse }>(OpenAPI, {
      method: "GET", url: "/api/management/commissions/pricing/tiers/{id}", path: { id: selectedId },
    });
    query.then(({ data }) => { if (active) setDraft(data); })
      .catch((failure) => { if (active) setError(commissionErrorMessage(failure, "Không tải được gói thiết kế.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; query.cancel(); };
  }, [selectedId, attempt]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.current || loading) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(OpenAPI, {
        method: "PUT", url: "/api/management/commissions/presets", mediaType: "application/json",
        body: { presets: [{
          tierCode: draft.tierCode?.trim(), tierName: draft.tierName?.trim(), description: draft.description,
          basePrice: draft.basePrice, discountPercent: custom ? 0 : draft.discountPercent ?? 0,
          maxRevisions: draft.maxRevisions, extraRevisionFeePercent: draft.extraRevisionFeePercent ?? 10,
          isActive: custom ? true : draft.isActive, displayOrder: draft.displayOrder ?? 0,
          triggerOptionIds: custom ? [] : draft.triggerOptionIds ?? [],
          includedOptionIds: custom ? [] : draft.includedOptionIds ?? [],
        }] },
      });
      setNotice("Đã lưu gói thiết kế. Cấu hình mới áp dụng cho các yêu cầu tạo sau.");
      onSaved();
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không lưu được gói thiết kế."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function toggle(key: "includedOptionIds" | "triggerOptionIds", id: number) {
    setDraft((current) => {
      const ids = current[key] ?? [];
      return { ...current, [key]: ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id] };
    });
  }

  return (
    <details className="space-y-3 rounded-xl border border-[#cfe3d0] bg-white p-5">
      <summary className="cursor-pointer text-lg font-bold text-[#155e59]">Cấu hình gói thiết kế</summary>
      <label className="block text-sm">Chọn gói
        <select className={control} value={selectedId} disabled={busy} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">Tạo gói mới</option>
          {tiers.map((tier) => <option key={tier.tierId} value={tier.tierId}>{tier.tierName} ({tier.tierCode})</option>)}
        </select>
      </label>
      {loading ? <p role="status">Đang tải gói…</p> : (
        <form onSubmit={save} className="space-y-3 text-sm">
          <fieldset disabled={busy || Boolean(selectedId && draft.tierId !== Number(selectedId))} className="grid gap-3 sm:grid-cols-2">
            <label>Mã gói<input className={control} required pattern="[A-Za-z][A-Za-z0-9_]{0,49}" readOnly={Boolean(selectedId)} value={draft.tierCode ?? ""} onChange={(event) => setDraft({ ...draft, tierCode: event.target.value })} /></label>
            <label>Tên gói<input className={control} required maxLength={255} value={draft.tierName ?? ""} onChange={(event) => setDraft({ ...draft, tierName: event.target.value })} /></label>
            <label>Giá cơ bản (VNĐ)<input className={control} type="number" min={0} max={9999999999.99} step={0.01} required value={draft.basePrice ?? ""} onChange={(event) => setDraft({ ...draft, basePrice: Number(event.target.value) })} /></label>
            <label>Lượt sửa miễn phí<input className={control} type="number" min={1} max={5} step={1} required value={draft.maxRevisions ?? 1} onChange={(event) => setDraft({ ...draft, maxRevisions: Number(event.target.value) })} /></label>
            <label>Phần trăm phí sửa bổ sung<input className={control} type="number" min={0} max={100} step={0.01} required value={draft.extraRevisionFeePercent ?? 10} onChange={(event) => setDraft({ ...draft, extraRevisionFeePercent: Number(event.target.value) })} /></label>
            {!custom && <label>Giảm giá gói (%)<input className={control} type="number" min={0} max={100} step={0.01} value={draft.discountPercent ?? 0} onChange={(event) => setDraft({ ...draft, discountPercent: Number(event.target.value) })} /></label>}
            <label className="sm:col-span-2">Mô tả<textarea className={control} maxLength={2000} value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            {!custom && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={draft.isActive !== false} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />Cho khách chọn gói này</label>}
            {!custom && rules.filter((rule) => rule.isActive !== false && ["SINGLE_SELECT", "MULTI_SELECT"].includes(rule.selectionType ?? "")).map((rule) => (
              <fieldset key={rule.configId} className="space-y-2 rounded-lg border p-3 sm:col-span-2">
                <legend className="font-semibold">{rule.configName}</legend>
                {(rule.options ?? []).filter((option) => option.isActive !== false && option.optionId != null).map((option) => (
                  <div key={option.optionId} className="flex flex-wrap items-center gap-3">
                    <span className="min-w-32 flex-1">{option.optionLabel}</span>
                    <label className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={draft.includedOptionIds?.includes(option.optionId!) ?? false} onChange={() => toggle("includedOptionIds", option.optionId!)} />Trong gói</label>
                    <label className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={draft.triggerOptionIds?.includes(option.optionId!) ?? false} onChange={() => toggle("triggerOptionIds", option.optionId!)} />Điều kiện chọn</label>
                  </div>
                ))}
              </fieldset>
            ))}
            <button className="min-h-11 rounded bg-[#155e59] px-4 font-semibold text-white sm:col-span-2">{busy ? "Đang lưu…" : "Lưu gói thiết kế"}</button>
          </fieldset>
        </form>
      )}
      {error && <div role="alert" className="text-sm text-red-700">{error} <button type="button" className="min-h-11 underline" onClick={() => setAttempt((value) => value + 1)}>Tải lại</button></div>}
      {notice && <p role="status" className="text-sm text-[#155e59]">{notice}</p>}
    </details>
  );
}
