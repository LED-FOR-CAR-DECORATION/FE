"use client";

import { useRef, useState, type FormEvent } from "react";
import { rejectCommission } from "../services/management-commission.api";
import { commissionErrorMessage } from "../errors";

export default function CommissionRequestRejection({ commissionId, onChanged }: { commissionId: number; onChanged: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !reason.trim()) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await rejectCommission(commissionId, reason.trim());
      onChanged();
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không từ chối được yêu cầu."));
      onChanged();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="border-2 border-red-600 bg-white p-3">
      <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-red-700">
        Từ chối yêu cầu
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-3 text-xs">
        <label className="block font-bold text-black">
          Lý do từ chối gửi cho khách
          <textarea
            required
            maxLength={1000}
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1.5 w-full border-2 border-black bg-white p-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </label>
        {error && (
          <p role="alert" className="border-2 border-red-600 bg-red-50 px-3 py-2 font-bold text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy || !reason.trim()}
          className="border-2 border-black bg-red-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Đang gửi…" : "Xác nhận từ chối"}
        </button>
      </form>
    </details>
  );
}
