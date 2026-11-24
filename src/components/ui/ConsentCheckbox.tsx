"use client";

import { useId, type ReactNode } from "react";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Required agreement checkbox placed right above the action it unlocks (UI standard §3.6). Never pre-checked. */
export default function ConsentCheckbox({ checked, onChange, children, disabled, className = "" }: ConsentCheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-2.5 border-2 p-2.5 text-xs font-medium leading-normal transition-colors ${
        checked ? "border-black bg-primary/10" : "border-black bg-white hover:bg-gray-50"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-ink disabled:cursor-not-allowed"
      />
      <span>{children}</span>
    </label>
  );
}

/** Link to a policy page that opens in a new tab so in-progress input is not lost. */
export function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="cursor-pointer font-bold text-primary-ink underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  );
}
