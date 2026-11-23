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
import { CommissionBrief } from "./FixedCommissionSteps";

type Rule = PricingRuleResponse & {
  configId: number;
};

const control = "mt-1 min-h-11 w-full p-2.5 border-2 border-black bg-white text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-60";
const referenceTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function optionLabel(option: PricingOptionResponse) {
  return option.optionLabel?.replace(/\s*\(\+\d+(?:[.,]\d+)?%\s+(?:Base|Subtotal)\)\s*$/i, "");
}

function optionPrice(option: PricingOptionResponse) {
  const rate = option.basePrice ?? 0;
  if (option.modifierType === "BASE_PERCENT") return `${rate}% giá cơ bản`;
  if (option.modifierType === "SUBTOTAL_PERCENT") return `${rate}% tạm tính`;
  return formatPrice(rate);
}

export default function ApiCommissionForm() {
  const [pricing, setPricing] = useState<PublicCommissionPricingResponse>();
  const [pricingError, setPricingError] = useState(false);
  const [tierCode, setTierCode] = useState("CUSTOM");
  const [choices, setChoices] = useState<Record<number, number[]>>({});
  const [values, setValues] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const [referenceError, setReferenceError] = useState("");
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

  const tier = pricing?.tiers?.find((item) => item.tierCode === tierCode)
    ?? pricing?.tiers?.find((item) => item.isCustom);
  const bundledIds = new Set(tier?.isCustom ? [] : tier?.bundledOptionIds ?? []);
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
  function selectTier(code: string) {
    const next = pricing?.tiers?.find((item) => item.tierCode === code);
    if (!next) return;
    setTierCode(code);
    const optionIds = new Set([...(next.bundledOptionIds ?? []), ...(next.triggerOptionIds ?? [])]);
    const nextChoices: Record<number, number[]> = {};
    for (const rule of rules) {
      const selected = (rule.options ?? []).flatMap((option) =>
        option.optionId !== undefined && optionIds.has(option.optionId) ? [option.optionId] : []);
      if (selected.length) nextChoices[rule.configId] = selected;
    }
    setChoices(nextChoices);
  }
  const basePrice = tier?.basePrice ?? 0;
  const baseCents = Math.round(basePrice * 100);
  const selectedLines = visible.flatMap((rule) => {
    const selected = optionsByRule.get(rule.configId) ?? [];
    const quantity = rule.selectionType === "QUANTITY" ? Number(values[rule.configId] || 0) : 1;
    const options = rule.selectionType === "QUANTITY" ? (rule.options ?? []).slice(0, 1)
      : (rule.options ?? []).filter(({ optionId }) => optionId !== undefined && selected.includes(optionId));
    return options.filter((option) => !bundledIds.has(option.optionId!)).map((option) => ({
      rule,
      modifier: option.modifierType ?? "FLAT_ADD",
      rate: option.basePrice ?? 0,
      quantity,
    }));
  });
  const base = selectedLines.reduce((sum, line) => sum + (line.rule.isBasePrice && line.modifier === "FLAT_ADD"
    ? Math.round(line.rate * line.quantity * 100) : 0), baseCents);
  const subtotal = selectedLines.reduce((sum, line) => {
    if (line.modifier === "BASE_PERCENT") return sum + Math.round(base * line.rate / 100);
    if (line.modifier === "FLAT_ADD" && !line.rule.isBasePrice) return sum + Math.round(line.rate * line.quantity * 100);
    return sum;
  }, base);
  const amounts = new Map<number, number>();
  for (const line of selectedLines) {
    const cents = line.modifier === "FLAT_ADD" ? Math.round(line.rate * line.quantity * 100)
      : Math.round((line.modifier === "BASE_PERCENT" ? base : subtotal) * line.rate / 100);
    amounts.set(line.rule.configId, (amounts.get(line.rule.configId) ?? 0) + cents);
  }
  const priceLines = visible.map((rule) => {
    return { id: rule.configId, label: rule.configName, cents: amounts.get(rule.configId) ?? 0 };
  });
  const total = (baseCents + priceLines.reduce((sum, line) => sum + line.cents, 0)) / 100;

  const selectedOptions = visible.flatMap((rule): Parameters<typeof submitCommission>[0]["selectedOptions"] => {
    const configId = rule.configId;
    const value = values[configId]?.trim();
    if (rule.selectionType === "TEXT_INPUT") return value ? [{ configId, textValue: value }] : [];
    if (rule.selectionType === "QUANTITY") return value ? [{ configId, quantity: Number(value) }] : [];
    const optionIds = optionsByRule.get(configId) ?? [];
    return optionIds.length ? [{ configId, optionIds }] : [];
  });

  function addReferences(files: File[]) {
    if (files.length + references.length > 5 ||
        files.some((file) => !referenceTypes.includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)) {
      setReferenceError("Chọn tối đa 5 ảnh JPG, PNG, WEBP hoặc GIF, mỗi ảnh không quá 5 MB.");
      return;
    }
    setReferenceError("");
    setReferences((current) => [...current, ...files]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !tier?.tierCode || user?.role !== "CUSTOMER") return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = note.trim();
    if (!title || !description) {
      setError("Nhập tiêu đề và mô tả thiết kế.");
      return;
    }
    if (visible.some((rule) => rule.isRequired && !selectedOptions.some(({ configId }) => configId === rule.configId))) {
      setError("Hãy điền các lựa chọn bắt buộc.");
      return;
    }
    const selectedIds = new Set(selectedOptions.flatMap((item) => item.optionIds ?? []));
    if ((tier.triggerOptionIds ?? []).some((id) => !selectedIds.has(id))) {
      setError("Các lựa chọn chưa đáp ứng điều kiện của gói. Hãy chọn lại gói hoặc chuyển sang tùy chỉnh.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const attachments = await Promise.all(references.map(uploadCommissionReference));
      if (loadSession()?.userId !== user.userId) throw new Error("Session changed");
      const { data } = await submitCommission({
        title,
        description,
        tierCode: tier.tierCode,
        attachments,
        openPaymentImmediately: true,
        selectedOptions,
      });
      router.replace(`/commission/${data.commissionId}/payment`);
    } catch (cause) {
      const body = (cause as { body?: { message?: string } }).body;
      setError(body?.message || "Không thể gửi yêu cầu Commission. Hãy thử lại.");
      pending.current = false;
      setBusy(false);
    }
  }

  if (pricingError || (pricing && !tier?.tierCode)) return <p role="alert" className="neo-box-no-hover border-l-8 border-l-red-700 p-4">Không tải được cấu hình giá Commission.</p>;
  if (!pricing) return <p role="status" className="neo-box-no-hover p-4 text-text-muted">Đang tải cấu hình Commission…</p>;

  return (
    <form onSubmit={submit} className="neo-box-no-hover space-y-6 p-4 sm:p-7">
      <h1 className="border-b-2 border-black pb-4 text-2xl font-black uppercase tracking-tight sm:text-3xl">Yêu cầu thiết kế Pixel Art</h1>
      {(pricing.tiers?.length ?? 0) > 1 && (
        <label className="block font-semibold">Gói thiết kế
          <select className={`${control} cursor-pointer`} value={tier?.tierCode} disabled={busy} onChange={(event) => selectTier(event.target.value)}>
            {pricing.tiers?.map((item) => <option key={item.tierId} value={item.tierCode}>{item.tierName}</option>)}
          </select>
          {tier?.description && <span className="mt-1 block text-sm font-normal">{tier.description}</span>}
          <span className="mt-1 block text-sm font-normal">{tier?.maxRevisions ?? 0} lượt chỉnh sửa miễn phí</span>
        </label>
      )}
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {visible.map((rule) => {
          const id = rule.configId;
          const descriptionId = rule.description ? `commission-rule-description-${id}` : undefined;
          const selected = optionsByRule.get(id) ?? [];
          const selectedPrice = priceLines.find((line) => line.id === id)?.cents ?? 0;
          if (rule.selectionType === "MULTI_SELECT") return (
            <fieldset key={id} aria-describedby={descriptionId}>
              <legend>{rule.configName}</legend>
              {rule.description && <p id={descriptionId} className="text-sm text-text-muted">{rule.description}</p>}
              {(rule.options ?? []).map((option) => {
                const optionId = option.optionId;
                if (optionId === undefined) return null;
                return (
                  <label key={optionId} className="flex min-h-11 items-center justify-between gap-3 border border-black/30 px-2 py-1 has-[:checked]:border-black has-[:checked]:bg-primary/15 has-[:enabled]:cursor-pointer has-[:disabled]:cursor-not-allowed">
                    <span className="flex items-center gap-2">
                    <input type="checkbox" className="size-4 shrink-0 accent-primary-ink enabled:cursor-pointer disabled:cursor-not-allowed" disabled={bundledIds.has(optionId)} checked={selected.includes(optionId)} onChange={(event) =>
                      setChoices({ ...choices, [id]: event.target.checked ? [...selected, optionId] : selected.filter((item) => item !== optionId) })} />
                    {optionLabel(option)}
                    </span>
                    <span className="shrink-0 font-semibold">{optionPrice(option)}</span>
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
                <select className={`${control} cursor-pointer`} required={rule.isRequired} aria-describedby={descriptionId}
                  disabled={selected.some((optionId) => bundledIds.has(optionId))}
                  value={selected[0] ?? ""} onChange={(event) => setChoices({ ...choices, [id]: event.target.value ? [Number(event.target.value)] : [] })}>
                  <option value="">Chọn {rule.configName}</option>
                  {(rule.options ?? []).map((option) => option.optionId !== undefined && (
                    <option key={option.optionId} value={option.optionId}>{optionLabel(option)}</option>
                  ))}
                </select>
              )}
              {rule.description && <span id={descriptionId} className="mt-1 block text-sm text-text-muted">{rule.description}</span>}
              </label>
              {rule.selectionType === "QUANTITY" || rule.selectionType === "TEXT_INPUT" ? (
                <p className="mt-2 text-sm text-text-muted">
                  {rule.selectionType === "QUANTITY" && rule.options?.[0]
                    ? `${optionPrice(rule.options[0])} / đơn vị · ${formatPrice(selectedPrice / 100)}`
                    : "Không tính thêm phí"}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-black/20 text-sm">
                  {(rule.options ?? []).filter((option) => option.optionId !== undefined).map((option) => (
                    <li key={option.optionId} className="flex justify-between gap-3 py-1">
                      <span>{optionLabel(option)}</span>
                      <span className="shrink-0 font-semibold">{optionPrice(option)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <label className="sm:col-span-2">Tiêu đề<input name="title" className={control} required maxLength={255} /></label>
        <div className="sm:col-span-2">
          <CommissionBrief note={note} onNote={setNote} references={references} onFiles={addReferences}
            onRemove={(index) => {
              setReferences((current) => current.filter((_, position) => position !== index));
              setReferenceError("");
            }} error={referenceError} maxNoteLength={2000} />
        </div>
      </fieldset>
      <section aria-labelledby="commission-price-heading" className="space-y-3 border-2 border-black bg-primary/15 p-4">
        <h2 id="commission-price-heading" className="font-black text-primary-ink">Chi tiết giá</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt>Giá cơ bản</dt><dd>{formatPrice(basePrice)}</dd></div>
          {!tier?.isCustom && <p className="text-sm">Giá gói đã bao gồm các phương án được chọn sẵn trong gói.</p>}
          {priceLines.filter((line) => line.cents !== 0).map((line) => (
            <div key={line.id} className="flex justify-between gap-3"><dt>{line.label}</dt><dd>{formatPrice(line.cents / 100)}</dd></div>
          ))}
        </dl>
        <p aria-live="polite" className="flex flex-wrap justify-between gap-2 border-t-2 border-black pt-3 tabular-nums font-black text-primary-ink">
          <span>Tổng thanh toán dự kiến</span><span>{formatPrice(total)}</span>
        </p>
      </section>
      {error && <p role="alert" className="neo-box-no-hover border-l-8 border-l-red-700 p-4">{error}</p>}
      {user?.role !== "CUSTOMER" && <p>Đăng nhập bằng tài khoản khách hàng để gửi yêu cầu.</p>}
      <button className="btn-primary min-h-11 w-full text-sm sm:w-auto" disabled={busy || user?.role !== "CUSTOMER"}>
        {busy ? "Đang gửi…" : "Gửi yêu cầu và đến trang thanh toán"}
      </button>
    </form>
  );
}
