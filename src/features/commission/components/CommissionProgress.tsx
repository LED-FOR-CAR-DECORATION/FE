import { Check } from "lucide-react";

export const commissionStages = ["Thiết kế", "Brief", "Thanh toán", "Chat"];

export function CommissionProgress({ stage }: { stage: number }) {
  return (
    <ol aria-label="Các bước đặt thiết kế" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      {commissionStages.map((label, index) => (
        <li key={label} aria-current={stage === index ? "step" : undefined}
          className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 font-medium motion-safe:transition-colors ${stage === index ? "bg-[#155e59] text-white" : "bg-white text-[#155e59]"}`}>
          <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs">
            {index < stage ? <Check size={14} /> : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
