"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Layers,
  Receipt,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import type { PublicCommissionPricingResponse } from "@/api_client/models/PublicCommissionPricingResponse";
import type { PricingRuleResponse } from "@/api_client/models/PricingRuleResponse";
import type { PricingOptionResponse } from "@/api_client/models/PricingOptionResponse";
import { loadSession } from "@/lib/auth/session";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useGallery } from "@/features/character/context/GalleryContext";
import { getCommissionPricing, submitCommission, uploadCommissionReference } from "../services/customer-commission.api";
import { CommissionBrief } from "./FixedCommissionSteps";

type Rule = PricingRuleResponse & {
  configId: number;
};

const CONTROL_CLASS =
  "mt-1.5 min-h-11 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-medium text-text-main transition-colors focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-60";

const REFERENCE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function optionLabel(option: PricingOptionResponse): string {
  return (option.optionLabel ?? "").replace(/\s*\(\+\d+(?:[.,]\d+)?%\s+(?:Base|Subtotal)\)\s*$/i, "");
}

function optionPriceTag(option: PricingOptionResponse, isBundled = false): string {
  if (isBundled) return "Đã gồm trong gói";
  const rate = option.basePrice ?? 0;
  if (option.modifierType === "BASE_PERCENT") return `+${rate}% giá cơ bản`;
  if (option.modifierType === "SUBTOTAL_PERCENT") return `+${rate}% tạm tính`;
  if (rate === 0) return "Mặc định";
  return `+${formatPrice(rate)}`;
}

/**
 * Form tạo yêu cầu thiết kế riêng Pixel Art (bố cục 2 cột đồng bộ Checkout).
 */
export default function ApiCommissionForm() {
  const [pricing, setPricing] = useState<PublicCommissionPricingResponse>();
  const [pricingError, setPricingError] = useState(false);
  const [tierCode, setTierCode] = useState("CUSTOM");
  const [choices, setChoices] = useState<Record<number, number[]>>({});
  const [values, setValues] = useState<Record<number, string>>({});
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const [referenceError, setReferenceError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const { user } = useAuth();
  const { extraCommissionRevisions } = useGallery();
  const router = useRouter();

  useEffect(() => {
    const request = getCommissionPricing();
    let active = true;
    request
      .then(({ data }) => {
        if (active) setPricing(data);
      })
      .catch(() => {
        if (active) setPricingError(true);
      });
    return () => {
      active = false;
      request.cancel();
    };
  }, []);

  const tier =
    pricing?.tiers?.find((item) => item.tierCode === tierCode) ??
    pricing?.tiers?.find((item) => item.isCustom);
  const bundledIds = new Set(tier?.isCustom ? [] : tier?.bundledOptionIds ?? []);
  const rules: Rule[] = (pricing?.rules ?? []).flatMap((rule) =>
    rule.configId === undefined ? [] : [{ ...rule, configId: rule.configId }],
  );
  const optionsByRule = new Map(
    rules.map((rule) => [
      rule.configId,
      choices[rule.configId] ??
        (rule.options ?? []).flatMap((option) =>
          option.isDefault && option.optionId !== undefined ? [option.optionId] : [],
        ),
    ]),
  );
  const ruleByOption = new Map(
    rules.flatMap((rule) => (rule.options ?? []).map((option) => [option.optionId, rule] as const)),
  );

  function isVisible(rule: Rule, visited = new Set<number>()): boolean {
    if (rule.dependsOnOptionId == null) return true;
    const parent = ruleByOption.get(rule.dependsOnOptionId);
    return (
      !!parent &&
      !visited.has(parent.configId) &&
      !!optionsByRule.get(parent.configId)?.includes(rule.dependsOnOptionId) &&
      isVisible(parent, new Set([...visited, rule.configId]))
    );
  }

  const visible = rules.filter((rule) => isVisible(rule));

  function selectTier(code: string) {
    const next = pricing?.tiers?.find((item) => item.tierCode === code);
    if (!next) return;
    setTierCode(code);
    setError("");
    const optionIds = new Set([...(next.bundledOptionIds ?? []), ...(next.triggerOptionIds ?? [])]);
    const nextChoices: Record<number, number[]> = {};
    for (const rule of rules) {
      const selected = (rule.options ?? []).flatMap((option) =>
        option.optionId !== undefined && optionIds.has(option.optionId) ? [option.optionId] : [],
      );
      if (selected.length) nextChoices[rule.configId] = selected;
    }
    setChoices(nextChoices);
  }

  const basePrice = tier?.basePrice ?? 0;
  const baseCents = Math.round(basePrice * 100);
  const selectedLines = visible.flatMap((rule) => {
    const selected = optionsByRule.get(rule.configId) ?? [];
    const quantity = rule.selectionType === "QUANTITY" ? Number(values[rule.configId] || 0) : 1;
    const options =
      rule.selectionType === "QUANTITY"
        ? (rule.options ?? []).slice(0, 1)
        : (rule.options ?? []).filter(
            ({ optionId }) => optionId !== undefined && selected.includes(optionId),
          );
    return options
      .filter((option) => !bundledIds.has(option.optionId!))
      .map((option) => ({
        rule,
        modifier: option.modifierType ?? "FLAT_ADD",
        rate: option.basePrice ?? 0,
        quantity,
      }));
  });

  const base = selectedLines.reduce(
    (sum, line) =>
      sum + (line.rule.isBasePrice && line.modifier === "FLAT_ADD" ? Math.round(line.rate * line.quantity * 100) : 0),
    baseCents,
  );
  const subtotal = selectedLines.reduce((sum, line) => {
    if (line.modifier === "BASE_PERCENT") return sum + Math.round((base * line.rate) / 100);
    if (line.modifier === "FLAT_ADD" && !line.rule.isBasePrice) {
      return sum + Math.round(line.rate * line.quantity * 100);
    }
    return sum;
  }, base);

  const amounts = new Map<number, number>();
  for (const line of selectedLines) {
    const cents =
      line.modifier === "FLAT_ADD"
        ? Math.round(line.rate * line.quantity * 100)
        : Math.round(((line.modifier === "BASE_PERCENT" ? base : subtotal) * line.rate) / 100);
    amounts.set(line.rule.configId, (amounts.get(line.rule.configId) ?? 0) + cents);
  }

  const priceLines = visible.map((rule) => ({
    id: rule.configId,
    label: rule.configName,
    cents: amounts.get(rule.configId) ?? 0,
  }));
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
    if (
      files.length + references.length > 5 ||
      files.some((file) => !REFERENCE_TYPES.includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)
    ) {
      setReferenceError("Chọn tối đa 5 ảnh JPG, PNG, WEBP hoặc GIF, mỗi ảnh không quá 5 MB.");
      return;
    }
    setReferenceError("");
    setReferences((current) => [...current, ...files]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !tier?.tierCode || user?.role !== "CUSTOMER") return;
    const trimmedTitle = title.trim();
    const trimmedDescription = note.trim();
    if (!trimmedTitle || !trimmedDescription) {
      setError("Vui lòng nhập đầy đủ tiêu đề và mô tả ý tưởng thiết kế.");
      return;
    }
    if (visible.some((rule) => rule.isRequired && !selectedOptions.some(({ configId }) => configId === rule.configId))) {
      setError("Vui lòng điền đầy đủ các thông số bắt buộc.");
      return;
    }
    const selectedIds = new Set(selectedOptions.flatMap((item) => item.optionIds ?? []));
    if ((tier.triggerOptionIds ?? []).some((id) => !selectedIds.has(id))) {
      setError("Các lựa chọn hiện tại chưa đáp ứng điều kiện của gói. Hãy chọn lại gói hoặc chuyển sang tùy chỉnh.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const attachments = await Promise.all(references.map(uploadCommissionReference));
      if (loadSession()?.userId !== user.userId) throw new Error("Session changed");
      const { data } = await submitCommission({
        title: trimmedTitle,
        description: trimmedDescription,
        tierCode: tier.tierCode,
        attachments,
        openPaymentImmediately: false,
        selectedOptions,
      });
      router.replace(`/commission/${data.commissionId}/payment`);
    } catch (cause) {
      const body = (cause as { body?: { message?: string } }).body;
      setError(body?.message || "Không thể gửi yêu cầu thiết kế riêng. Hãy thử lại.");
      pending.current = false;
      setBusy(false);
    }
  }

  if (pricingError || (pricing && !tier?.tierCode)) {
    return (
      <div role="alert" className="neo-box-no-hover flex items-start gap-2.5 border-l-8 border-l-red-600 bg-white p-5 text-sm font-bold text-red-700">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <span>Không tải được cấu hình giá thiết kế riêng. Vui lòng tải lại trang.</span>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" role="status" aria-label="Đang tải cấu hình thiết kế riêng">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <div className="neo-box-no-hover h-44 animate-pulse bg-gray-100 p-5" />
          <div className="neo-box-no-hover h-64 animate-pulse bg-gray-100 p-5" />
        </div>
        <div className="neo-box-no-hover h-72 animate-pulse bg-gray-100 p-5 lg:col-span-5 xl:col-span-4" />
      </div>
    );
  }

  const tiers = pricing.tiers ?? [];

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3 border-b-2 border-black pb-4">
        <Sparkles size={28} className="mt-0.5 shrink-0 text-primary-ink" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Tạo yêu cầu thiết kế riêng</h1>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            Chọn gói, cấu hình thông số hiển thị LED và mô tả ý tưởng để nhận báo giá từ họa sĩ.
          </p>
        </div>
      </div>

      {/* Two-Column Checkout-Aligned Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Structured Form Cards */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Card 1: Gói thiết kế */}
          {tiers.length > 0 && (
            <section className="neo-box-no-hover bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-primary-ink" />
                  <h2 className="font-black uppercase">1. Chọn gói thiết kế</h2>
                </div>
                <span className="text-xs font-bold text-text-muted">{tiers.length} gói có sẵn</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {tiers.map((item) => {
                  const isSelected = item.tierCode === tier?.tierCode;
                  const priceLabel =
                    item.isCustom && (item.basePrice ?? 0) === 0
                      ? "Tính theo cấu hình"
                      : formatPrice(item.basePrice ?? 0);

                  return (
                    <label
                      key={item.tierId ?? item.tierCode}
                      className={`flex flex-col justify-between gap-2 border-2 p-3.5 transition-colors ${
                        busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-primary-ink bg-primary/10 shadow-[3px_3px_0_0_#000]"
                          : "border-black bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="commission-tier"
                            value={item.tierCode}
                            checked={isSelected}
                            disabled={busy}
                            onChange={() => item.tierCode && selectTier(item.tierCode)}
                            className="size-4 shrink-0 accent-[var(--color-primary-ink)]"
                          />
                          <span className="text-sm font-black uppercase text-black">{item.tierName}</span>
                        </span>
                        {(item.savingsAmount ?? 0) > 0 && (
                          <span className="shrink-0 border border-black bg-primary px-1.5 py-0.5 text-[11px] font-black uppercase text-black">
                            Tiết kiệm {formatPrice(item.savingsAmount!)}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs leading-relaxed text-text-muted">{item.description}</p>
                      )}

                      <div className="mt-1 flex items-center justify-between gap-2 border-t border-black/15 pt-2 text-xs">
                        <span className="font-semibold text-text-muted">
                          {item.maxRevisions ?? 0} lượt sửa miễn phí
                        </span>
                        <span className="font-black tabular-nums text-primary-ink">{priceLabel}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* Card 2: Thông số kỹ thuật */}
          <section className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-primary-ink" />
                <h2 className="font-black uppercase">2. Thông số kỹ thuật</h2>
              </div>
              {!tier?.isCustom && (
                <span className="border border-black bg-primary/15 px-2 py-0.5 text-[11px] font-black uppercase text-primary-ink">
                  Đã áp dụng cấu hình gói
                </span>
              )}
            </div>

            <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
              {visible.map((rule) => {
                const id = rule.configId;
                const descriptionId = rule.description ? `commission-rule-description-${id}` : undefined;
                const selected = optionsByRule.get(id) ?? [];
                const selectedPrice = priceLines.find((line) => line.id === id)?.cents ?? 0;
                const validOptions = (rule.options ?? []).filter((opt) => opt.optionId !== undefined);

                if (rule.selectionType === "MULTI_SELECT") {
                  return (
                    <fieldset key={id} aria-describedby={descriptionId} className="space-y-2.5 sm:col-span-2">
                      <legend className="text-xs font-bold uppercase text-text-main">
                        {rule.configName}
                        {rule.isRequired && <span aria-hidden className="ml-1 text-red-600">*</span>}
                      </legend>
                      {rule.description && (
                        <p id={descriptionId} className="text-xs text-text-muted">
                          {rule.description}
                        </p>
                      )}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {validOptions.map((option) => {
                          const optionId = option.optionId!;
                          const checked = selected.includes(optionId);
                          const isBundled = bundledIds.has(optionId);
                          return (
                            <label
                              key={optionId}
                              className={`flex min-h-11 items-center justify-between gap-3 border-2 px-3 py-2 text-xs transition-colors ${
                                isBundled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                              } ${
                                checked
                                  ? "border-primary-ink bg-primary/10"
                                  : "border-black bg-white hover:bg-gray-50"
                              }`}
                            >
                              <span className="flex items-center gap-2 font-bold text-black">
                                <input
                                  type="checkbox"
                                  className="size-4 shrink-0 accent-[var(--color-primary-ink)] enabled:cursor-pointer disabled:cursor-not-allowed"
                                  disabled={isBundled}
                                  checked={checked}
                                  onChange={(event) =>
                                    setChoices({
                                      ...choices,
                                      [id]: event.target.checked
                                        ? [...selected, optionId]
                                        : selected.filter((item) => item !== optionId),
                                    })
                                  }
                                />
                                {optionLabel(option)}
                              </span>
                              <span className="shrink-0 font-black tabular-nums text-primary-ink">
                                {optionPriceTag(option, isBundled)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                }

                if (rule.selectionType === "SINGLE_SELECT" && rule.uiType === "RADIO" && validOptions.length <= 4) {
                  const isLockedByPreset = selected.some((optionId) => bundledIds.has(optionId));
                  return (
                    <fieldset key={id} aria-describedby={descriptionId} className="space-y-2.5 sm:col-span-2">
                      <legend className="text-xs font-bold uppercase text-text-main">
                        {rule.configName}
                        {rule.isRequired && <span aria-hidden className="ml-1 text-red-600">*</span>}
                      </legend>
                      {rule.description && (
                        <p id={descriptionId} className="text-xs text-text-muted">
                          {rule.description}
                        </p>
                      )}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {validOptions.map((option) => {
                          const optionId = option.optionId!;
                          const checked = selected[0] === optionId;
                          const isBundled = bundledIds.has(optionId);
                          return (
                            <label
                              key={optionId}
                              className={`flex min-h-11 items-center justify-between gap-3 border-2 px-3 py-2 text-xs transition-colors ${
                                isLockedByPreset ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                              } ${
                                checked
                                  ? "border-primary-ink bg-primary/10"
                                  : "border-black bg-white hover:bg-gray-50"
                              }`}
                            >
                              <span className="flex items-center gap-2 font-bold text-black">
                                <input
                                  type="radio"
                                  name={`rule-${id}`}
                                  value={optionId}
                                  disabled={isLockedByPreset}
                                  checked={checked}
                                  onChange={() => setChoices({ ...choices, [id]: [optionId] })}
                                  className="size-4 shrink-0 accent-[var(--color-primary-ink)]"
                                />
                                {optionLabel(option)}
                              </span>
                              <span className="shrink-0 font-black tabular-nums text-primary-ink">
                                {optionPriceTag(option, isBundled)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                }

                const isQuantity = rule.selectionType === "QUANTITY";
                const isText = rule.selectionType === "TEXT_INPUT";
                const isLockedByPreset = !isQuantity && !isText && selected.some((optionId) => bundledIds.has(optionId));

                return (
                  <div key={id}>
                    <label className="block text-xs font-bold uppercase text-text-main">
                      <span>
                        {rule.configName}
                        {rule.isRequired && <span aria-hidden className="ml-1 text-red-600">*</span>}
                      </span>

                      {isText || isQuantity ? (
                        <input
                          className={CONTROL_CLASS}
                          required={rule.isRequired}
                          aria-describedby={descriptionId}
                          type={isQuantity ? "number" : "text"}
                          min={rule.minQuantity ?? undefined}
                          max={rule.maxQuantity ?? undefined}
                          maxLength={500}
                          placeholder={isQuantity && rule.minQuantity != null ? `Tối thiểu ${rule.minQuantity}` : undefined}
                          value={values[id] ?? ""}
                          onChange={(event) => setValues({ ...values, [id]: event.target.value })}
                        />
                      ) : (
                        <select
                          className={`${CONTROL_CLASS} cursor-pointer`}
                          required={rule.isRequired}
                          aria-describedby={descriptionId}
                          disabled={isLockedByPreset}
                          value={selected[0] ?? ""}
                          onChange={(event) =>
                            setChoices({
                              ...choices,
                              [id]: event.target.value ? [Number(event.target.value)] : [],
                            })
                          }
                        >
                          <option value="">Chọn {rule.configName}</option>
                          {validOptions.map((option) => (
                            <option key={option.optionId} value={option.optionId}>
                              {optionLabel(option)} ({optionPriceTag(option, bundledIds.has(option.optionId!))})
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    {rule.description && (
                      <p id={descriptionId} className="mt-1.5 text-xs text-text-muted">
                        {rule.description}
                      </p>
                    )}

                    {isQuantity && rule.options?.[0] && (
                      <p className="mt-1 text-xs font-semibold text-primary-ink tabular-nums">
                        Đơn giá: {optionPriceTag(rule.options[0])} / đơn vị · Tạm tính: {formatPrice(selectedPrice / 100)}
                      </p>
                    )}
                  </div>
                );
              })}
            </fieldset>
          </section>

          {/* Card 3: Ý tưởng & Tài liệu tham khảo */}
          <section className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3">
              <FileText size={18} className="text-primary-ink" />
              <h2 className="font-black uppercase">3. Ý tưởng & ảnh tham khảo</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="commission-title" className="block text-xs font-bold uppercase text-text-main">
                  Tiêu đề yêu cầu <span aria-hidden className="text-red-600">*</span>
                </label>
                <input
                  id="commission-title"
                  name="title"
                  className={CONTROL_CLASS}
                  required
                  maxLength={255}
                  disabled={busy}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="VD: Mèo Cyberpunk vẫy tay 32×32"
                />
              </div>

              <CommissionBrief
                note={note}
                onNote={setNote}
                references={references}
                onFiles={addReferences}
                onRemove={(index) => {
                  setReferences((current) => current.filter((_, position) => position !== index));
                  setReferenceError("");
                }}
                error={referenceError}
                maxNoteLength={2000}
              />
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Cost Summary & Submit */}
        <aside className="lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4">
          <section
            aria-labelledby="commission-price-heading"
            className="neo-box-no-hover bg-white p-5"
          >
            <div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3">
              <Receipt size={18} className="text-primary-ink" />
              <h2 id="commission-price-heading" className="font-black uppercase">
                Tóm tắt chi phí dự kiến
              </h2>
            </div>

            <div className="mb-4 flex items-center justify-between gap-2 border-2 border-black bg-primary/10 px-3 py-2.5 text-xs">
              <div>
                <p className="font-black uppercase text-black">{tier?.tierName}</p>
                <p className="font-semibold text-primary-ink">
                  {tier?.maxRevisions ?? 0} lượt chỉnh sửa miễn phí mặc định cho đơn này
                </p>
                {extraCommissionRevisions > 0 && (
                  <p className="mt-0.5 text-[11px] font-bold text-[#2d6a4f]">
                    Ví hội viên còn +{extraCommissionRevisions} lượt miễn phí (dùng chung cho mọi đơn Commission)
                  </p>
                )}
              </div>
              <CheckCircle2 size={18} className="shrink-0 text-primary-ink" />
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Giá gói cơ bản</dt>
                <dd className="font-bold tabular-nums">{formatPrice(basePrice)}</dd>
              </div>

              {priceLines
                .filter((line) => line.cents !== 0)
                .map((line) => (
                  <div key={line.id} className="flex justify-between gap-3">
                    <dt className="text-text-muted">{line.label}</dt>
                    <dd className="shrink-0 font-bold tabular-nums">+{formatPrice(line.cents / 100)}</dd>
                  </div>
                ))}

              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Phí kiểm duyệt yêu cầu</dt>
                <dd className="font-bold text-primary-ink">Miễn phí</dd>
              </div>
            </dl>

            <div
              aria-live="polite"
              className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-dashed border-black pt-3"
            >
              <span className="shrink-0 whitespace-nowrap text-xs font-black uppercase text-black sm:text-sm">
                Tổng dự kiến
              </span>
              <span className="shrink-0 whitespace-nowrap text-xl font-black tabular-nums text-primary-ink">
                {formatPrice(total)}
              </span>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || user?.role !== "CUSTOMER"}
              aria-busy={busy}
              className="btn-primary mt-5 flex min-h-12 w-full items-center justify-center gap-2 py-3.5 text-sm font-black uppercase"
            >
              {busy ? "Đang gửi yêu cầu…" : "Gửi yêu cầu thiết kế"}
            </button>

            {user?.role !== "CUSTOMER" && (
              <p className="mt-2.5 text-center text-xs font-bold text-red-600">
                Vui lòng{" "}
                <Link href="/login?returnUrl=/commission/new" className="underline">
                  đăng nhập tài khoản khách hàng
                </Link>{" "}
                để gửi yêu cầu.
              </p>
            )}

            <div className="mt-4 flex items-start gap-2 border-t border-black/15 pt-3 text-xs font-medium text-text-muted">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary-ink" />
              <span>
                Yêu cầu sẽ được nhân viên xem xét & xác nhận báo giá trước khi mở thanh toán. Phòng trao đổi với họa sĩ mở ngay sau khi thanh toán thành công.
              </span>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
