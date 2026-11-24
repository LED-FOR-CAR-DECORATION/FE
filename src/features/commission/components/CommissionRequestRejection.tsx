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
    <details className="rounded-lg border border-red-200 p-3">
      <summary className="cursor-pointer font-semibold text-red-700">Từ chối yêu cầu</summary>
      <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
        <label className="block">Lý do từ chối gửi cho khách
          <textarea required maxLength={1000} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded border border-red-200 p-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy || !reason.trim()} className="min-h-11 rounded bg-red-700 px-4 font-semibold text-white disabled:opacity-50">
          {busy ? "Đang gửi…" : "Xác nhận từ chối"}
        </button>
      </form>
    </details>
  );
}
