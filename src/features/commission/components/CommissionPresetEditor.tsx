"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Settings2,
} from "lucide-react";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import type { ManagementPricingTierResponse } from "@/api_client/models/ManagementPricingTierResponse";
import type { ManagementPricingRuleResponse } from "@/api_client/models/ManagementPricingRuleResponse";
import { commissionErrorMessage } from "../errors";

const control =
  "mt-1.5 block w-full border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black placeholder:text-text-muted focus:bg-white disabled:cursor-not-allowed disabled:opacity-60";
const fieldLabel = "block text-[11px] font-black uppercase tracking-wider text-black";
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
    <details className="group border-2 border-black bg-white shadow-[4px_4px_0_0_#000]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 transition-colors hover:bg-[#f3faf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:p-6">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
            <Settings2 className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <div>
            <span className="block text-sm font-black uppercase tracking-wider text-black sm:text-base">
              Cấu hình gói thiết kế
            </span>
            <span className="mt-0.5 block text-xs font-medium text-text-muted">
              Tạo mới hoặc chỉnh sửa giá cơ bản, lượt sửa và tùy chọn đi kèm của từng gói.
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
          Mở / Thu gọn
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180"
            aria-hidden="true"
          />
        </span>
      </summary>

      <div className="space-y-4 border-t-2 border-black p-5 sm:p-6">
        <label className={fieldLabel}>
          Chọn gói
          <select
            className={control}
            value={selectedId}
            disabled={busy}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Tạo gói mới</option>
            {tiers.map((tier) => (
              <option key={tier.tierId} value={tier.tierId}>
                {tier.tierName} ({tier.tierCode})
              </option>
            ))}
          </select>
        </label>

        {loading ? (
          <p
            role="status"
            className="flex items-center gap-2 border-2 border-dashed border-black/25 bg-gray-50 p-4 text-xs font-black uppercase tracking-wider text-black"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary-ink" aria-hidden="true" />
            Đang tải gói…
          </p>
        ) : (
          <form onSubmit={save} className="space-y-4 text-xs">
            <fieldset
              disabled={busy || Boolean(selectedId && draft.tierId !== Number(selectedId))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className={fieldLabel}>
                Mã gói
                <input
                  className={control}
                  required
                  pattern="[A-Za-z][A-Za-z0-9_]{0,49}"
                  readOnly={Boolean(selectedId)}
                  value={draft.tierCode ?? ""}
                  onChange={(event) => setDraft({ ...draft, tierCode: event.target.value })}
                />
              </label>
              <label className={fieldLabel}>
                Tên gói
                <input
                  className={control}
                  required
                  maxLength={255}
                  value={draft.tierName ?? ""}
                  onChange={(event) => setDraft({ ...draft, tierName: event.target.value })}
                />
              </label>
              <label className={fieldLabel}>
                Giá cơ bản (VNĐ)
                <input
                  className={`${control} tabular-nums`}
                  type="number"
                  min={0}
                  max={9999999999.99}
                  step={0.01}
                  required
                  value={draft.basePrice ?? ""}
                  onChange={(event) => setDraft({ ...draft, basePrice: Number(event.target.value) })}
                />
              </label>
              <label className={fieldLabel}>
                Lượt sửa miễn phí
                <input
                  className={`${control} tabular-nums`}
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  required
                  value={draft.maxRevisions ?? 1}
                  onChange={(event) => setDraft({ ...draft, maxRevisions: Number(event.target.value) })}
                />
              </label>
              <label className={fieldLabel}>
                Phần trăm phí sửa bổ sung
                <input
                  className={`${control} tabular-nums`}
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  required
                  value={draft.extraRevisionFeePercent ?? 10}
                  onChange={(event) =>
                    setDraft({ ...draft, extraRevisionFeePercent: Number(event.target.value) })
                  }
                />
              </label>
              {!custom && (
                <label className={fieldLabel}>
                  Giảm giá gói (%)
                  <input
                    className={`${control} tabular-nums`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={draft.discountPercent ?? 0}
                    onChange={(event) =>
                      setDraft({ ...draft, discountPercent: Number(event.target.value) })
                    }
                  />
                </label>
              )}
              <label className={`${fieldLabel} sm:col-span-2`}>
                Mô tả
                <textarea
                  rows={2}
                  className={control}
                  maxLength={2000}
                  value={draft.description ?? ""}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>
              {!custom && (
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5 border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-[#f3faf5] sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-primary-ink"
                    checked={draft.isActive !== false}
                    onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                  />
                  Cho khách chọn gói này
                </label>
              )}
              {!custom &&
                rules
                  .filter(
                    (rule) =>
                      rule.isActive !== false &&
                      ["SINGLE_SELECT", "MULTI_SELECT"].includes(rule.selectionType ?? ""),
                  )
                  .map((rule) => (
                    <fieldset
                      key={rule.configId}
                      className="space-y-2 border-2 border-black bg-gray-50 p-3.5 sm:col-span-2"
                    >
                      <legend className="border border-black bg-[#e9f5ed] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                        {rule.configName}
                      </legend>
                      <div className="divide-y divide-black/15">
                        {(rule.options ?? [])
                          .filter((option) => option.isActive !== false && option.optionId != null)
                          .map((option) => (
                            <div
                              key={option.optionId}
                              className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-1 last:pb-0"
                            >
                              <span className="min-w-32 flex-1 font-bold text-black">
                                {option.optionLabel}
                              </span>
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="flex min-h-9 cursor-pointer items-center gap-1.5 border border-black bg-white px-2.5 py-1 text-[11px] font-bold text-black hover:bg-primary/20">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 cursor-pointer accent-primary-ink"
                                    checked={draft.includedOptionIds?.includes(option.optionId!) ?? false}
                                    onChange={() => toggle("includedOptionIds", option.optionId!)}
                                  />
                                  Trong gói
                                </label>
                                <label className="flex min-h-9 cursor-pointer items-center gap-1.5 border border-black bg-white px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#fef08a]/50">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 cursor-pointer accent-primary-ink"
                                    checked={draft.triggerOptionIds?.includes(option.optionId!) ?? false}
                                    onChange={() => toggle("triggerOptionIds", option.optionId!)}
                                  />
                                  Điều kiện chọn
                                </label>
                              </div>
                            </div>
                          ))}
                      </div>
                    </fieldset>
                  ))}

              <div className="border-t-2 border-dashed border-gray-200 pt-4 sm:col-span-2">
                <button
                  type="submit"
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  {busy ? "Đang lưu…" : "Lưu gói thiết kế"}
                </button>
              </div>
            </fieldset>
          </form>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              {error}
            </span>
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Tải lại
            </button>
          </div>
        )}

        {notice && (
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 border-2 border-black bg-primary/35 px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}
      </div>
    </details>
  );
}
