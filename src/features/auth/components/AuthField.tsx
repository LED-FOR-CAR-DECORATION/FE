"use client";

import type { ReactNode } from "react";

export default function AuthField({ id, label, value, onChange, type = "text", placeholder, error, icon, action }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  type?: string; placeholder?: string; error?: string; icon?: ReactNode; action?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">{icon}</span>}
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full bg-gray-100 border-2 ${error ? "border-red-500" : "border-black"} py-2 ${icon ? "pl-9" : "pl-3"} ${action ? "pr-10" : "pr-3"} outline-none focus:bg-white transition-colors text-sm font-medium`} />
        {action && <span className="absolute right-2 top-1/2 -translate-y-1/2">{action}</span>}
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
