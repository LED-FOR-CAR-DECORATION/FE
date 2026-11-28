"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
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
import { isRequestCancelled } from "@/features/commission/errors";
import { getCommissionPricing, submitCommission, uploadCommissionReference } from "../services/customer-commission.api";
import { CommissionBrief } from "./FixedCommissionSteps";

type Rule = PricingRuleResponse & {
  configId: number;
};

type WizardStep = 1 | 2 | 3;

const CONTROL_CLASS =
  "mt-1 h-9 w-full border-2 border-black bg-gray-50 px-2.5 text-xs font-semibold text-text-main transition-colors focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-60";

const REFERENCE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function optionLabel(option: PricingOptionResponse): string {
  return (option.optionLabel ?? "").replace(/\s*\(\+\d+(?:[.,]\d+)?%\s+(?:Base|Subtotal)\)\s*$/i, "");
}

function optionPriceTag(option: PricingOptionResponse, isBundled = false): string {
  if (isBundled) return "Đã gồm gói";
  const rate = option.basePrice ?? 0;
  if (option.modifierType === "BASE_PERCENT") return `+${rate}% cơ bản`;
  if (option.modifierType === "SUBTOTAL_PERCENT") return `+${rate}% tạm tính`;
  if (rate === 0) return "Mặc định";
  return `+${formatPrice(rate)}`;
}

function isFullWidthChipRule(rule: Rule): boolean {
  const count = (rule.options ?? []).filter((opt) => opt.optionId !== undefined).length;
  return (
    rule.selectionType === "MULTI_SELECT" ||
    (rule.selectionType === "SINGLE_SELECT" && rule.uiType === "RADIO" && count <= 4)
  );
}

function estimateRuleHeight(rule: Rule): number {
  if (isFullWidthChipRule(rule)) {
    const count = (rule.options ?? []).filter((opt) => opt.optionId !== undefined).length;
    return count > 3 ? 96 : 66;
  }
  return rule.selectionType === "QUANTITY" ? 78 : 62;
}

/**
 * Splits visible dynamic pricing rules into height-fitted sub-pages on desktop
 * so Step 2 never introduces vertical scrolling even on compact 720px laptops.
 */
function paginateRulesByHeight(rules: Rule[], maxBodyHeight: number, isDesktop: boolean): Rule[][] {
  if (!isDesktop || rules.length === 0) return [rules];

  const pages: Rule[][] = [];
  let currentPage: Rule[] = [];
  let currentHeight = 0;
  let pendingHalfRowHeight = 0;
  const rowGap = 10;

  const flushHalfRow = () => {
    if (pendingHalfRowHeight > 0) {
      currentHeight += (currentHeight > 0 ? rowGap : 0) + pendingHalfRowHeight;
      pendingHalfRowHeight = 0;
    }
  };

  for (const rule of rules) {
    const fullWidth = isFullWidthChipRule(rule);
    const ruleHeight = estimateRuleHeight(rule);

    if (fullWidth) {
      const projectedHeight =
        currentHeight +
        (pendingHalfRowHeight > 0 ? (currentHeight > 0 ? rowGap : 0) + pendingHalfRowHeight : 0);
      const nextHeight = projectedHeight + (projectedHeight > 0 ? rowGap : 0) + ruleHeight;
      if (currentPage.length > 0 && nextHeight > maxBodyHeight) {
        pages.push(currentPage);
        currentPage = [rule];
        currentHeight = ruleHeight;
        pendingHalfRowHeight = 0;
      } else {
        flushHalfRow();
        currentPage.push(rule);
        currentHeight = (currentHeight > 0 ? currentHeight + rowGap : 0) + ruleHeight;
      }
      continue;
    }

    if (pendingHalfRowHeight > 0) {
      // Fits into the second column of the current 2-column row
      const pairHeight = Math.max(pendingHalfRowHeight, ruleHeight);
      const nextHeight = (currentHeight > 0 ? currentHeight + rowGap : 0) + pairHeight;
      if (currentPage.length > 1 && nextHeight > maxBodyHeight) {
        pages.push(currentPage);
        currentPage = [rule];
        currentHeight = 0;
        pendingHalfRowHeight = ruleHeight;
      } else {
        currentPage.push(rule);
        currentHeight = nextHeight;
        pendingHalfRowHeight = 0;
      }
    } else {
      const projectedHeight = (currentHeight > 0 ? currentHeight + rowGap : 0) + ruleHeight;
      if (currentPage.length > 0 && projectedHeight > maxBodyHeight) {
        pages.push(currentPage);
        currentPage = [rule];
        currentHeight = 0;
        pendingHalfRowHeight = ruleHeight;
      } else {
        currentPage.push(rule);
        pendingHalfRowHeight = ruleHeight;
      }
    }
  }

  flushHalfRow();
  if (currentPage.length > 0) pages.push(currentPage);
  return pages.length > 0 ? pages : [rules];
}

function useCommissionWizardViewport(): {
  isDesktop: boolean;
  step2BodyBudget: number;
  maxVisibleSummaryLines: number;
} {
  const [viewport, setViewport] = useState<{ isDesktop: boolean; height: number }>({
    isDesktop: true,
    height: 800,
  });

  useEffect(() => {
    let timer: number | undefined;
    const compute = () => {
      setViewport({
        isDesktop: window.innerWidth >= 1024,
        height: window.innerHeight,
      });
    };
    compute();
    const onResize = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return {
    isDesktop: viewport.isDesktop,
    // Chrome on /commission/new lg+: Header (106) + main py (24) + top header (50) + gap (10) + card pad/borders (32) + step bar (48) + step subhead (26) + bottom nav (48) + gaps (16) = ~360px
    step2BodyBudget: Math.max(220, viewport.height - 368),
    maxVisibleSummaryLines: viewport.height < 780 ? 4 : 6,
  };
}

/**
 * Form tạo yêu cầu thiết kế riêng Pixel Art dạng Wizard 3 bước trên 1 màn hình desktop (không cuộn).
 */
export default function ApiCommissionForm() {
  const [pricing, setPricing] = useState<PublicCommissionPricingResponse>();
  const [pricingError, setPricingError] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [tierPage, setTierPage] = useState(0);
  const [ruleSubPage, setRuleSubPage] = useState(0);
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
  const { isDesktop, step2BodyBudget, maxVisibleSummaryLines } = useCommissionWizardViewport();

  useEffect(() => {
    const request = getCommissionPricing();
    let active = true;
    request
      .then(({ data }) => {
        if (active) setPricing(data);
      })
      .catch((cause: unknown) => {
        if (active && !isRequestCancelled(cause)) setPricingError(true);
      });
    return () => {
      active = false;
      request.cancel();
    };
  }, []);

  const tier =
    pricing?.tiers?.find((item) => item.tierCode === tierCode) ??
    pricing?.tiers?.find((item) => item.isCustom);
  const bundledIds = useMemo(
    () => new Set(tier?.isCustom ? [] : tier?.bundledOptionIds ?? []),
    [tier],
  );
  const rules: Rule[] = useMemo(
    () =>
      (pricing?.rules ?? []).flatMap((rule) =>
        rule.configId === undefined ? [] : [{ ...rule, configId: rule.configId }],
      ),
    [pricing?.rules],
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
  const rulePages = paginateRulesByHeight(visible, step2BodyBudget, isDesktop);
  const safeRuleSubPage = Math.min(ruleSubPage, Math.max(0, rulePages.length - 1));
  const activeRuleSlice = rulePages[safeRuleSubPage] ?? [];

  const tiers = pricing?.tiers ?? [];
  const tiersPerPage = isDesktop && step2BodyBudget < 310 ? 4 : 6;
  const tierTotalPages = Math.max(1, Math.ceil(tiers.length / tiersPerPage));
  const safeTierPage = Math.min(tierPage, tierTotalPages - 1);
  const visibleTiers = tiers.slice(safeTierPage * tiersPerPage, (safeTierPage + 1) * tiersPerPage);

  useEffect(() => {
    if (ruleSubPage >= rulePages.length) {
      setRuleSubPage(Math.max(0, rulePages.length - 1));
    }
  }, [rulePages.length, ruleSubPage]);

  useEffect(() => {
    if (tierPage >= tierTotalPages) {
      setTierPage(Math.max(0, tierTotalPages - 1));
    }
  }, [tierPage, tierTotalPages]);

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
  const activePriceLines = priceLines.filter((line) => line.cents !== 0);
  const visibleSummaryLines = activePriceLines.slice(0, maxVisibleSummaryLines);
  const hiddenSummaryLines = activePriceLines.slice(maxVisibleSummaryLines);
  const hiddenSummaryCents = hiddenSummaryLines.reduce((sum, line) => sum + line.cents, 0);
  const total = (baseCents + priceLines.reduce((sum, line) => sum + line.cents, 0)) / 100;

  const selectedOptions = visible.flatMap((rule): Parameters<typeof submitCommission>[0]["selectedOptions"] => {
    const configId = rule.configId;
    const value = values[configId]?.trim();
    if (rule.selectionType === "TEXT_INPUT") return value ? [{ configId, textValue: value }] : [];
    if (rule.selectionType === "QUANTITY") return value ? [{ configId, quantity: Number(value) }] : [];
    const optionIds = optionsByRule.get(configId) ?? [];
    return optionIds.length ? [{ configId, optionIds }] : [];
  });

  const missingRequiredRule = visible.find(
    (rule) => rule.isRequired && !selectedOptions.some(({ configId }) => configId === rule.configId),
  );
  const step1Complete = Boolean(tier?.tierCode);
  const step2Complete = !missingRequiredRule;
  const step3Complete = Boolean(title.trim() && note.trim());

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
    if (pending.current || user?.role !== "CUSTOMER") return;

    if (!tier?.tierCode) {
      setStep(1);
      setError("Vui lòng chọn gói thiết kế.");
      return;
    }

    if (missingRequiredRule) {
      const targetSubPage = rulePages.findIndex((group) =>
        group.some((rule) => rule.configId === missingRequiredRule.configId),
      );
      setStep(2);
      if (targetSubPage >= 0) setRuleSubPage(targetSubPage);
      setError(`Vui lòng hoàn thành thông số bắt buộc: ${missingRequiredRule.configName}.`);
      return;
    }

    const selectedIds = new Set(selectedOptions.flatMap((item) => item.optionIds ?? []));
    if ((tier.triggerOptionIds ?? []).some((id) => !selectedIds.has(id))) {
      setStep(1);
      setError("Các lựa chọn hiện tại chưa đáp ứng điều kiện của gói. Hãy chọn lại gói hoặc chuyển sang tùy chỉnh.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = note.trim();
    if (!trimmedTitle || !trimmedDescription) {
      setStep(3);
      setError("Vui lòng nhập đầy đủ tiêu đề và mô tả ý tưởng thiết kế.");
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

  const pageHeader = (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2.5">
      <div className="flex items-center gap-2.5">
        <Sparkles size={22} className="shrink-0 text-primary-ink" />
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
            Tạo yêu cầu thiết kế riêng
          </h1>
          <p className="hidden text-[11px] font-semibold text-text-muted sm:block">
            Chọn gói, cấu hình thông số hiển thị LED và mô tả ý tưởng để nhận báo giá từ họa sĩ.
          </p>
        </div>
      </div>
      <Link
        href="/commission"
        className="btn-secondary inline-flex h-9 shrink-0 items-center gap-1.5 px-3! py-0! text-xs font-black uppercase"
      >
        <ArrowLeft size={14} />
        Quay lại danh sách
      </Link>
    </div>
  );

  if (pricingError || (pricing && !tier?.tierCode)) {
    return (
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
        {pageHeader}
        <div role="alert" className="neo-box-no-hover flex items-start gap-2.5 border-l-8 border-l-red-600 bg-white p-5 text-sm font-bold text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>Không tải được cấu hình giá thiết kế riêng. Vui lòng tải lại trang.</span>
        </div>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0" role="status" aria-label="Đang tải cấu hình thiết kế riêng">
        {pageHeader}
        <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-12">
          <div className="neo-box-no-hover h-80 animate-pulse bg-gray-100 p-4 lg:col-span-7 lg:h-full xl:col-span-8" />
          <div className="neo-box-no-hover h-72 animate-pulse bg-gray-100 p-4 lg:col-span-5 lg:h-full xl:col-span-4" />
        </div>
      </div>
    );
  }

  const wizardTabs: Array<{ id: WizardStep; label: string; icon: typeof Layers; done: boolean }> = [
    { id: 1, label: "1. Chọn gói", icon: Layers, done: step1Complete },
    { id: 2, label: `2. Thông số (${visible.length})`, icon: Sliders, done: step2Complete },
    { id: 3, label: "3. Ý tưởng & ảnh", icon: FileText, done: step3Complete },
  ];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2.5 lg:h-full lg:min-h-0">
      {pageHeader}

      {/* Two-Column Zero-Scroll Wizard */}
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:items-stretch">
        {/* Left Column: 3-Step Tabbed Card */}
        <section className="neo-box-no-hover flex flex-col bg-white p-3.5 sm:p-4 lg:col-span-7 lg:h-full lg:min-h-0 xl:col-span-8">
          {/* Stepper Navigation Tabs */}
          <div
            role="tablist"
            aria-label="Các bước tạo yêu cầu thiết kế"
            className="grid shrink-0 grid-cols-3 gap-2 border-b-2 border-black pb-2.5"
          >
            {wizardTabs.map((item) => {
              const Icon = item.icon;
              const isActive = step === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setStep(item.id);
                    setError("");
                  }}
                  className={`flex h-9 cursor-pointer items-center justify-between gap-1.5 border-2 border-black px-2.5 text-left text-[11px] font-black uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    isActive
                      ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                      : "bg-gray-50 text-text-main hover:bg-white"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <Icon size={14} className="shrink-0 text-primary-ink" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.done && (
                    <span className="grid size-4 shrink-0 place-items-center border border-black bg-[#2d6a4f] text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Step Body */}
          <div className="flex min-h-0 flex-1 flex-col justify-between py-2.5">
            {step === 1 && (
              <div className="flex min-h-0 flex-1 flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-text-muted">
                    Chọn gói thiết kế có sẵn để áp dụng cấu hình chuẩn hoặc Gói Tùy chỉnh để tự chọn thông số.
                  </p>
                  {tierTotalPages > 1 && (
                    <div className="flex shrink-0 items-center gap-1 text-[11px] font-black">
                      <button
                        type="button"
                        disabled={safeTierPage <= 0}
                        onClick={() => setTierPage((p) => Math.max(0, p - 1))}
                        aria-label="Trang gói trước"
                        className="grid size-7 cursor-pointer place-items-center border-2 border-black bg-white disabled:opacity-40"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="px-1 tabular-nums">
                        {safeTierPage + 1}/{tierTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeTierPage >= tierTotalPages - 1}
                        onClick={() => setTierPage((p) => Math.min(tierTotalPages - 1, p + 1))}
                        aria-label="Trang gói sau"
                        className="grid size-7 cursor-pointer place-items-center border-2 border-black bg-white disabled:opacity-40"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid min-h-0 flex-1 content-start gap-2.5 sm:grid-cols-2">
                  {visibleTiers.map((item) => {
                    const isSelected = item.tierCode === tier?.tierCode;
                    const priceLabel =
                      item.isCustom && (item.basePrice ?? 0) === 0
                        ? "Tính theo cấu hình"
                        : formatPrice(item.basePrice ?? 0);

                    return (
                      <label
                        key={item.tierId ?? item.tierCode}
                        className={`flex flex-col justify-between gap-1.5 border-2 p-3 transition-colors ${
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
                            <span className="text-xs font-black uppercase text-black sm:text-sm">
                              {item.tierName}
                            </span>
                          </span>
                          {(item.savingsAmount ?? 0) > 0 && (
                            <span className="shrink-0 border border-black bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                              Tiết kiệm {formatPrice(item.savingsAmount!)}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p
                            title={item.description}
                            className="line-clamp-2 text-[11px] leading-snug text-text-muted"
                          >
                            {item.description}
                          </p>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/15 pt-1.5 text-[11px]">
                          <span className="font-semibold text-text-muted">
                            {item.maxRevisions ?? 0} lượt sửa miễn phí
                          </span>
                          <span className="font-black tabular-nums text-primary-ink">{priceLabel}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex min-h-0 flex-1 flex-col gap-2.5">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-text-muted">
                      Cấu hình hiển thị & tùy chọn bổ sung cho tác phẩm LED.
                    </span>
                    {!tier?.isCustom && (
                      <span className="border border-black bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase text-primary-ink">
                        Đang dùng gói {tier?.tierName}
                      </span>
                    )}
                  </div>

                  {rulePages.length > 1 && (
                    <div className="flex shrink-0 items-center gap-1 text-[11px] font-black">
                      <span className="text-text-muted">Nhóm thông số</span>
                      <button
                        type="button"
                        disabled={safeRuleSubPage <= 0}
                        onClick={() => setRuleSubPage((p) => Math.max(0, p - 1))}
                        aria-label="Nhóm thông số trước"
                        className="grid size-7 cursor-pointer place-items-center border-2 border-black bg-white disabled:opacity-40"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="px-1 tabular-nums">
                        {safeRuleSubPage + 1}/{rulePages.length}
                      </span>
                      <button
                        type="button"
                        disabled={safeRuleSubPage >= rulePages.length - 1}
                        onClick={() => setRuleSubPage((p) => Math.min(rulePages.length - 1, p + 1))}
                        aria-label="Nhóm thông số sau"
                        className="grid size-7 cursor-pointer place-items-center border-2 border-black bg-white disabled:opacity-40"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <fieldset disabled={busy} className="grid min-h-0 flex-1 content-start gap-x-4 gap-y-2.5 sm:grid-cols-2">
                  {activeRuleSlice.map((rule) => {
                    const id = rule.configId;
                    const selected = optionsByRule.get(id) ?? [];
                    const selectedPrice = priceLines.find((line) => line.id === id)?.cents ?? 0;
                    const validOptions = (rule.options ?? []).filter((opt) => opt.optionId !== undefined);

                    if (rule.selectionType === "MULTI_SELECT") {
                      return (
                        <fieldset key={id} className="space-y-1.5 sm:col-span-2">
                          <legend className="flex items-center gap-1.5 text-[11px] font-black uppercase text-text-main">
                            <span>
                              {rule.configName}
                              {rule.isRequired && <span aria-hidden className="ml-1 text-red-600">*</span>}
                            </span>
                            {rule.description && (
                              <span title={rule.description} className="cursor-help text-text-muted" aria-label={rule.description}>
                                <Info size={13} />
                              </span>
                            )}
                          </legend>
                          <div className="flex flex-wrap gap-1.5">
                            {validOptions.map((option) => {
                              const optionId = option.optionId!;
                              const checked = selected.includes(optionId);
                              const isBundled = bundledIds.has(optionId);
                              return (
                                <label
                                  key={optionId}
                                  className={`inline-flex h-8 items-center gap-2 border-2 px-2.5 text-[11px] transition-colors ${
                                    isBundled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                                  } ${
                                    checked
                                      ? "border-primary-ink bg-primary/15 shadow-[2px_2px_0_0_#000]"
                                      : "border-black bg-white hover:bg-gray-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="size-3.5 shrink-0 accent-[var(--color-primary-ink)] enabled:cursor-pointer disabled:cursor-not-allowed"
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
                                  <span className="font-bold text-black">{optionLabel(option)}</span>
                                  <span className="font-black tabular-nums text-primary-ink">
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
                        <fieldset key={id} className="space-y-1.5 sm:col-span-2">
                          <legend className="flex items-center gap-1.5 text-[11px] font-black uppercase text-text-main">
                            <span>
                              {rule.configName}
                              {rule.isRequired && <span aria-hidden className="ml-1 text-red-600">*</span>}
                            </span>
                            {rule.description && (
                              <span title={rule.description} className="cursor-help text-text-muted" aria-label={rule.description}>
                                <Info size={13} />
                              </span>
                            )}
                          </legend>
                          <div className="flex flex-wrap gap-1.5">
                            {validOptions.map((option) => {
                              const optionId = option.optionId!;
                              const checked = selected[0] === optionId;
                              const isBundled = bundledIds.has(optionId);
                              return (
                                <label
                                  key={optionId}
                                  className={`inline-flex h-8 items-center gap-2 border-2 px-2.5 text-[11px] transition-colors ${
                                    isLockedByPreset ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                                  } ${
                                    checked
                                      ? "border-primary-ink bg-primary/15 shadow-[2px_2px_0_0_#000]"
                                      : "border-black bg-white hover:bg-gray-50"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`rule-${id}`}
                                    value={optionId}
                                    disabled={isLockedByPreset}
                                    checked={checked}
                                    onChange={() => setChoices({ ...choices, [id]: [optionId] })}
                                    className="size-3.5 shrink-0 accent-[var(--color-primary-ink)]"
                                  />
                                  <span className="font-bold text-black">{optionLabel(option)}</span>
                                  <span className="font-black tabular-nums text-primary-ink">
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
                        <label className="block text-[11px] font-black uppercase text-text-main">
                          <span className="inline-flex items-center gap-1.5">
                            <span>
                              {rule.configName}
                              {rule.isRequired && <span aria-hidden className="ml-0.5 text-red-600">*</span>}
                            </span>
                            {rule.description && (
                              <span title={rule.description} className="cursor-help text-text-muted" aria-label={rule.description}>
                                <Info size={12} />
                              </span>
                            )}
                          </span>

                          {isText || isQuantity ? (
                            <input
                              className={CONTROL_CLASS}
                              required={rule.isRequired}
                              type={isQuantity ? "number" : "text"}
                              min={rule.minQuantity ?? undefined}
                              max={rule.maxQuantity ?? undefined}
                              maxLength={500}
                              placeholder={
                                isQuantity && rule.minQuantity != null
                                  ? `Tối thiểu ${rule.minQuantity}`
                                  : rule.description || undefined
                              }
                              value={values[id] ?? ""}
                              onChange={(event) => setValues({ ...values, [id]: event.target.value })}
                            />
                          ) : (
                            <select
                              className={`${CONTROL_CLASS} cursor-pointer`}
                              required={rule.isRequired}
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

                        {isQuantity && rule.options?.[0] && (
                          <p className="mt-1 text-[10px] font-semibold tabular-nums text-primary-ink">
                            Đơn giá: {optionPriceTag(rule.options[0])} / đơn vị · Tạm tính: {formatPrice(selectedPrice / 100)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
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
                  compact
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
            )}
          </div>

          {/* Bottom Step Navigation */}
          <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t-2 border-black pt-2.5">
            <button
              type="button"
              disabled={step === 1 || busy}
              onClick={() => {
                setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
                setError("");
              }}
              className="btn-secondary inline-flex h-9 items-center gap-1.5 px-3! py-0! text-xs font-black uppercase disabled:opacity-40"
            >
              <ArrowLeft size={14} />
              Bước trước
            </button>

            <span className="text-xs font-bold uppercase text-text-muted">Bước {step} / 3</span>

            {step < 3 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep((prev) => (prev < 3 ? ((prev + 1) as WizardStep) : prev));
                  setError("");
                }}
                className="btn-primary inline-flex h-9 items-center gap-1.5 px-3.5! py-0! text-xs font-black uppercase"
              >
                Tiếp theo
                <ArrowRight size={14} />
              </button>
            ) : (
              <span className="text-[11px] font-bold text-primary-ink">
                Kiểm tra chi phí & bấm Gửi →
              </span>
            )}
          </div>
        </section>

        {/* Right Column: Cost Summary & Submit */}
        <aside className="lg:col-span-5 lg:h-full lg:min-h-0 xl:col-span-4">
          <section
            aria-labelledby="commission-price-heading"
            className="neo-box-no-hover flex flex-col justify-between bg-white p-3.5 sm:p-4 lg:h-full lg:min-h-0"
          >
            <div className="min-h-0 flex-1">
              <div className="mb-2.5 flex items-center gap-2 border-b-2 border-black pb-2">
                <Receipt size={16} className="text-primary-ink" />
                <h2 id="commission-price-heading" className="text-sm font-black uppercase">
                  Tóm tắt chi phí dự kiến
                </h2>
              </div>

              <div className="mb-2.5 flex items-center justify-between gap-2 border-2 border-black bg-primary/10 px-2.5 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-black uppercase text-black">{tier?.tierName}</p>
                  <p className="text-[11px] font-semibold text-primary-ink">
                    {Math.max(tier?.maxRevisions ?? 1, extraCommissionRevisions)} lượt chỉnh sửa miễn phí
                  </p>
                  {extraCommissionRevisions > (tier?.maxRevisions ?? 1) && (
                    <p className="text-[10px] font-bold text-[#2d6a4f]">
                      Nâng từ {tier?.maxRevisions ?? 1} lượt nhờ gói hội viên
                    </p>
                  )}
                </div>
                <CheckCircle2 size={16} className="shrink-0 text-primary-ink" />
              </div>

              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Giá gói cơ bản</dt>
                  <dd className="font-bold tabular-nums">{formatPrice(basePrice)}</dd>
                </div>

                {visibleSummaryLines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-3">
                    <dt className="truncate text-text-muted">{line.label}</dt>
                    <dd className="shrink-0 font-bold tabular-nums">+{formatPrice(line.cents / 100)}</dd>
                  </div>
                ))}

                {hiddenSummaryLines.length > 0 && (
                  <div
                    className="flex justify-between gap-3"
                    title={hiddenSummaryLines
                      .map((line) => `${line.label}: +${formatPrice(line.cents / 100)}`)
                      .join("\n")}
                  >
                    <dt className="cursor-help text-text-muted underline decoration-dotted">
                      + {hiddenSummaryLines.length} tùy chọn bổ sung khác
                    </dt>
                    <dd className="shrink-0 font-bold tabular-nums">
                      +{formatPrice(hiddenSummaryCents / 100)}
                    </dd>
                  </div>
                )}

                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Phí kiểm duyệt yêu cầu</dt>
                  <dd className="font-bold text-primary-ink">Miễn phí</dd>
                </div>
              </dl>
            </div>

            <div className="mt-3 shrink-0 border-t-2 border-dashed border-black pt-2.5 lg:mt-auto">
              <div aria-live="polite" className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 whitespace-nowrap text-xs font-black uppercase text-black">
                  Tổng dự kiến
                </span>
                <span className="shrink-0 whitespace-nowrap text-lg font-black tabular-nums text-primary-ink">
                  {formatPrice(total)}
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-2 flex items-start gap-2 border-2 border-red-600 bg-red-50 p-2 text-[11px] font-bold text-red-700"
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || user?.role !== "CUSTOMER"}
                aria-busy={busy}
                className="btn-primary mt-2.5 flex h-10 w-full items-center justify-center gap-2 text-xs font-black uppercase"
              >
                {busy ? "Đang gửi yêu cầu…" : "Gửi yêu cầu thiết kế"}
              </button>

              {user?.role !== "CUSTOMER" && (
                <p className="mt-2 text-center text-[11px] font-bold text-red-600">
                  Vui lòng{" "}
                  <Link href="/login?returnUrl=/commission/new" className="underline">
                    đăng nhập tài khoản khách hàng
                  </Link>{" "}
                  để gửi yêu cầu.
                </p>
              )}

              <div className="mt-2.5 flex items-start gap-2 border-t border-black/15 pt-2 text-[11px] leading-snug font-medium text-text-muted">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary-ink" />
                <span>
                  Nhân viên xác nhận báo giá trước khi mở thanh toán. Phòng trao đổi với họa sĩ mở ngay sau khi thanh toán.
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
