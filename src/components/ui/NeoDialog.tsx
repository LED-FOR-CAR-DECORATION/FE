"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface NeoDialogProps {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** While true (request in flight) Escape / backdrop / X do not close. */
  busy?: boolean;
  /** When true the backdrop click does not close (e.g. a form with unsaved input). */
  dismissOnBackdrop?: boolean;
  tone?: "default" | "danger";
}

const SIZE = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

/**
 * Neo-brutalist dialog for the customer purchase flow (UI standard §3.8).
 * Render conditionally. Moves focus inside, traps Tab, closes on Escape, restores focus on close.
 */
export default function NeoDialog({
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  busy = false,
  dismissOnBackdrop = true,
  tone = "default",
}: NeoDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const firstField = dialog?.querySelector<HTMLElement>("input, textarea, select");
    (firstField ?? dialog)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="neo-dialog-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissOnBackdrop && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role={tone === "danger" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`neo-dialog-panel relative my-auto w-full ${SIZE[size]} border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none`}
      >
        <header
          className={`flex items-start justify-between gap-3 border-b-2 border-black px-5 py-3 ${
            tone === "danger" ? "bg-red-50" : "bg-white"
          }`}
        >
          <div className="min-w-0">
            <h2 id={titleId} className={`font-black uppercase ${tone === "danger" ? "text-red-700" : ""}`}>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="cursor-pointer grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-white hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </header>
        {children && <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>}
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t-2 border-black px-5 py-3">{footer}</footer>
        )}
      </div>
      <style jsx>{`
        .neo-dialog-backdrop { animation: neo-fade 150ms ease both; }
        .neo-dialog-panel { animation: neo-rise 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        @keyframes neo-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes neo-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .neo-dialog-backdrop, .neo-dialog-panel { animation: none; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
