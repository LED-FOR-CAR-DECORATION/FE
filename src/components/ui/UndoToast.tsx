"use client";

import { Undo2 } from "lucide-react";

interface UndoToastProps {
  message: string | null;
  onUndo: () => void;
}

/** Bottom toast with an Undo action (UI standard §3.7). Renders nothing when `message` is null. */
export default function UndoToast({ message, onUndo }: UndoToastProps) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4">
      {message && (
        <div className="neo-box-no-hover pointer-events-auto flex items-center gap-4 bg-white px-4 py-3 text-sm font-bold">
          <span>{message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="cursor-pointer inline-flex min-h-9 items-center gap-1.5 border-2 border-black bg-primary px-3 text-xs font-black uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Undo2 size={13} /> Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
}
