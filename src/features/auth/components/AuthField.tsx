"use client";

import type { ReactNode } from "react";

export default function AuthField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  icon,
  action,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  icon?: ReactNode;
  action?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-black uppercase tracking-wider text-[#173b28] flex items-center gap-1">
          {label}
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      </div>

      <div className="relative group">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-[#198653]">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full bg-[#f8faf8] border-2 ${
            error
              ? "border-red-500 bg-red-50/40 focus:border-red-600 focus:bg-white"
              : "border-black focus:border-[#198653] focus:bg-white focus:shadow-[2px_2px_0px_0px_#198653]"
          } py-2.5 ${icon ? "pl-9" : "pl-3"} ${
            action ? "pr-10" : "pr-3"
          } text-sm font-semibold text-black placeholder:text-gray-400 placeholder:font-normal outline-none transition-all`}
        />
        {action && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            {action}
          </span>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-bold text-red-600 flex items-center gap-1 mt-0.5 animate-fadeIn">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
