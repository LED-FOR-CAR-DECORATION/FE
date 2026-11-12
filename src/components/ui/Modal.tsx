"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  /** While true (e.g. a request is in flight) Escape / backdrop / X will not close the modal. */
  busy?: boolean;
}

/**
 * Accessible dialog. Render it conditionally (`{open && <Modal ... />}`).
 *
 * It is portalled to <body> because `.manager-main > *` is animated with a transform,
 * which would otherwise become the containing block of `position: fixed` descendants.
 */
export default function Modal({ title, description, onClose, children, footer, size = "md", busy = false }: ModalProps) {
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
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onCloseRef.current();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10351f]/45 p-4 backdrop-blur-sm"
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
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[#d8e6dc] bg-white text-[#173b28] shadow-[0_24px_60px_rgba(16,53,31,0.28)] outline-none ${
          size === "lg" ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e3efe6] bg-gradient-to-br from-[#f4fbf6] to-white px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black tracking-tight">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm font-medium text-text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng hộp thoại"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-transparent text-text-muted transition-colors hover:border-[#d8e6dc] hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e3efe6] bg-[#f9fcfa] px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
