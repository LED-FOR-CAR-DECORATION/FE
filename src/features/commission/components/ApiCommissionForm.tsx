"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import type { PublicCommissionPricingResponse } from "@/api_client/models/PublicCommissionPricingResponse";
import type { PricingRuleResponse } from "@/api_client/models/PricingRuleResponse";
import type { PricingOptionResponse } from "@/api_client/models/PricingOptionResponse";
import { loadSession } from "@/lib/auth/session";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getCommissionPricing, submitCommission, uploadCommissionReference } from "../services/customer-commission.api";
import { commissionButton } from "./FixedCommissionSteps";

type Rule = Omit<PricingRuleResponse, "selectionType"> & {
  configId: number;
  selectionType?: "SINGLE_SELECT" | "MULTI_SELECT" | "TEXT_INPUT" | "QUANTITY";
  minQuantity?: number | null;
  maxQuantity?: number | null;
};

const foundationalRules = new Set(["FORMAT_TYPE", "MATRIX_SIZE", "FRAME_RANGE"]);
const control = "mt-1 w-full rounded-lg border border-[#86a795] bg-white p-2.5";

function optionLabel(option: PricingOptionResponse) {
  // The checkout API adds raw option amounts. Show that amount separately from legacy price hints in labels.
  return option.optionLabel?.replace(/\s*\(\+\d+(?:[.,]\d+)?%\s+(?:Base|Subtotal)\)\s*$/i, "");
}

export default function ApiCommissionForm() {
  const [pricing, setPricing] = useState<PublicCommissionPricingResponse>();
  const [pricingError, setPricingError] = useState(false);
  const [choices, setChoices] = useState<Record<number, number[]>>({});
  const [values, setValues] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const request = getCommissionPricing();
    let active = true;
    request.then(({ data }) => {
      if (active) setPricing(data);
    }).catch(() => {
      if (active) setPricingError(true);
    });
    return () => {
      active = false;
      request.cancel();
    };
  }, []);

  const tier = pricing?.tiers?.find((item) => item.isCustom);
  const rules: Rule[] = (pricing?.rules ?? []).flatMap((rule) =>
    rule.configId === undefined ? [] : [{ ...rule, configId: rule.configId }]);
  const optionsByRule = new Map(rules.map((rule) => [
    rule.configId,
    choices[rule.configId] ?? (rule.options ?? []).flatMap((option) =>
      option.isDefault && option.optionId !== undefined ? [option.optionId] : []),
  ]));
  const ruleByOption = new Map(rules.flatMap((rule) =>
    (rule.options ?? []).map((option) => [option.optionId, rule] as const)));
  function isVisible(rule: Rule, visited = new Set<number>()): boolean {
    if (rule.dependsOnOptionId == null) return true;
    const parent = ruleByOption.get(rule.dependsOnOptionId);
    return !!parent && !visited.has(parent.configId)
      && !!optionsByRule.get(parent.configId)?.includes(rule.dependsOnOptionId)
      && isVisible(parent, new Set([...visited, rule.configId]));
  }
  const visible = rules.filter((rule) => isVisible(rule));
  const basePrice = tier?.basePrice ?? 0;
  const priceLines = visible.map((rule) => {
    const selected = optionsByRule.get(rule.configId) ?? [];
    const cents = (rule.options ?? []).reduce((sum, option) =>
      sum + (option.optionId !== undefined && selected.includes(option.optionId)
        ? Math.round((option.basePrice ?? 0) * 100) : 0), 0);
    return { id: rule.configId, label: rule.configName, cents };
  });
  const total = (Math.round(basePrice * 100) + priceLines.reduce((sum, line) => sum + line.cents, 0)) / 100;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !tier?.tierCode || user?.role !== "CUSTOMER") return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const files = form.getAll("references").filter((file): file is File => file instanceof File && file.size > 0);
    if (!title || !description || files.length > 5 || files.some((file) =>
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Nhập tiêu đề, mô tả và chọn tối đa 5 ảnh JPG, PNG, WEBP hoặc GIF, mỗi ảnh không quá 5 MB.");
      return;
    }
    if (visible.some((rule) => rule.isRequired && !optionsByRule.get(rule.configId)?.length && !values[rule.configId]?.trim())) {
      setError("Hãy điền các lựa chọn bắt buộc.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const attachments = await Promise.all(files.map(uploadCommissionReference));
      if (loadSession()?.userId !== user.userId) throw new Error("Session changed");
      const { data } = await submitCommission({
        title,
        description,
        tierCode: tier.tierCode,
        attachments,
        step1Selections: visible.filter((rule) => foundationalRules.has(rule.ruleKey ?? "")).flatMap(({ configId }) =>
          (optionsByRule.get(configId) ?? []).map((optionId) => ({ configId, optionId }))),
        selectedOptions: visible.filter((rule) => !foundationalRules.has(rule.ruleKey ?? "")).flatMap(({ configId }) => {
          const optionIds = optionsByRule.get(configId);
          const textValue = values[configId]?.trim();
          return optionIds?.length || textValue ? [{ configId, optionIds, textValue }] : [];
        }),
      });
      router.replace(`/commission/${data.commissionId}/payment`);
    } catch (cause) {
      const body = (cause as { body?: { message?: string } }).body;
      setError(body?.message || "Không thể gửi yêu cầu Commission. Hãy thử lại.");
      pending.current = false;
      setBusy(false);
    }
  }

  if (pricingError || (pricing && !tier?.tierCode)) return <p role="alert">Không tải được cấu hình giá Commission.</p>;
  if (!pricing) return <p role="status">Đang tải cấu hình Commission…</p>;

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] p-5 sm:p-7">
      <h1 className="text-2xl font-black text-[#155e59]">Yêu cầu thiết kế Pixel Art</h1>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {visible.map((rule) => {
          const id = rule.configId;
          const descriptionId = rule.description ? `commission-rule-description-${id}` : undefined;
          const selected = optionsByRule.get(id) ?? [];
          const selectedPrice = priceLines.find((line) => line.id === id)?.cents ?? 0;
          if (rule.selectionType === "MULTI_SELECT") return (
            <fieldset key={id} aria-describedby={descriptionId}>
              <legend>{rule.configName}</legend>
              {rule.description && <p id={descriptionId} className="text-sm text-[#526159]">{rule.description}</p>}
              {(rule.options ?? []).map((option) => {
                const optionId = option.optionId;
                if (optionId === undefined) return null;
                return (
                  <label key={optionId} className="flex items-center justify-between gap-3 py-1">
                    <span className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.includes(optionId)} onChange={(event) =>
                      setChoices({ ...choices, [id]: event.target.checked ? [...selected, optionId] : selected.filter((item) => item !== optionId) })} />
                    {optionLabel(option)}
                    </span>
                    <span className="shrink-0 font-semibold">{formatPrice(option.basePrice ?? 0)}</span>
                  </label>
                );
              })}
            </fieldset>
          );
          return (
            <div key={id}>
              <label className="block">{rule.configName}
              {rule.selectionType === "TEXT_INPUT" || rule.selectionType === "QUANTITY" ? (
                <input className={control} required={rule.isRequired} aria-describedby={descriptionId}
                  type={rule.selectionType === "QUANTITY" ? "number" : "text"}
                  min={rule.minQuantity ?? undefined} max={rule.maxQuantity ?? undefined} maxLength={500}
                  value={values[id] ?? ""} onChange={(event) => setValues({ ...values, [id]: event.target.value })} />
              ) : (
                <select className={control} required={rule.isRequired || rule.ruleKey === "FRAME_RANGE"} aria-describedby={descriptionId}
                  value={selected[0] ?? ""} onChange={(event) => setChoices({ ...choices, [id]: event.target.value ? [Number(event.target.value)] : [] })}>
                  <option value="">Chọn {rule.configName}</option>
                  {(rule.options ?? []).map((option) => option.optionId !== undefined && (
                    <option key={option.optionId} value={option.optionId}>{optionLabel(option)}</option>
                  ))}
                </select>
              )}
              {rule.description && <span id={descriptionId} className="mt-1 block text-sm text-[#526159]">{rule.description}</span>}
              </label>
              {rule.selectionType === "QUANTITY" || rule.selectionType === "TEXT_INPUT" ? (
                <p className="mt-2 text-sm text-[#526159]">{selectedPrice === 0 ? "Không tính thêm phí" : formatPrice(selectedPrice / 100)}</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#cfe3d0] text-sm">
                  {(rule.options ?? []).filter((option) => option.optionId !== undefined).map((option) => (
                    <li key={option.optionId} className="flex justify-between gap-3 py-1">
                      <span>{optionLabel(option)}</span>
                      <span className="shrink-0 font-semibold">{formatPrice(option.basePrice ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <label className="sm:col-span-2">Tiêu đề<input name="title" className={control} required maxLength={255} /></label>
        <label className="sm:col-span-2">Mô tả thiết kế<textarea name="description" className={control} required maxLength={2000} rows={4} /></label>
        <label className="sm:col-span-2">Ảnh tham khảo<input name="references" className={control} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" /></label>
      </fieldset>
      <section aria-labelledby="commission-price-heading" className="space-y-3 rounded-xl border border-[#cfe3d0] bg-white p-4">
        <h2 id="commission-price-heading" className="font-bold text-[#155e59]">Chi tiết giá</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt>Giá cơ bản</dt><dd>{formatPrice(basePrice)}</dd></div>
          {priceLines.filter((line) => line.cents !== 0).map((line) => (
            <div key={line.id} className="flex justify-between gap-3"><dt>{line.label}</dt><dd>{formatPrice(line.cents / 100)}</dd></div>
          ))}
        </dl>
        <p aria-live="polite" className="flex flex-wrap justify-between gap-2 border-t border-[#cfe3d0] pt-3 font-bold text-[#155e59]">
          <span>Tổng thanh toán dự kiến</span><span>{formatPrice(total)}</span>
        </p>
      </section>
      <p className="text-sm">Mã thanh toán được cấp sau khi nhân viên duyệt yêu cầu.</p>
      {error && <p role="alert">{error}</p>}
      {user?.role !== "CUSTOMER" && <p>Đăng nhập bằng tài khoản khách hàng để gửi yêu cầu.</p>}
      <button className={commissionButton} disabled={busy || user?.role !== "CUSTOMER"}>
        {busy ? "Đang gửi…" : "Gửi yêu cầu và đến trang thanh toán"}
      </button>
    </form>
  );
}
