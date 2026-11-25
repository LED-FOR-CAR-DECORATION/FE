"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface StoreModalProps {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  iconBoxClassName?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
  /** While true (e.g. a request is in flight) Escape / backdrop / X will not close the modal. */
  busy?: boolean;
}

/**
 * Storefront Neo-Brutalist accessible modal dialog shared across Store Product Management.
 */
export default function StoreModal({
  title,
  description,
  badge,
  icon,
  iconBoxClassName = "bg-primary",
  onClose,
  children,
  footer,
  size = "md",
  busy = false,
}: StoreModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 font-sans text-text-main sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden border-2 border-black bg-white text-black shadow-[6px_6px_0_0_#000] outline-none ${
          size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-black bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center border-2 border-black text-black shadow-[2px_2px_0_0_#000] ${iconBoxClassName}`}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {badge && (
                <span className="mb-1 inline-flex items-center border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                  {badge}
                </span>
              )}
              <h2
                id={titleId}
                className="text-base font-black uppercase tracking-tight text-black sm:text-lg"
              >
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-xs font-medium text-text-muted sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng hộp thoại"
            className="btn-secondary shrink-0 p-1.5! shadow-[2px_2px_0_0_#000]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 bg-white px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
