"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { commissionErrorMessage } from "../errors";
import { listCommissionDesigners, reassignCommission, type CommissionManagementDetail, type DesignerOption } from "../services/management-commission.api";

export default function CommissionReassignment({ detail, onChanged }: {
  detail: CommissionManagementDetail; onChanged: () => void;
}) {
  const { user } = useAuth();
  const [staffId, setStaffId] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [reason, setReason] = useState("");
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const manager = user?.role === "MANAGER" || user?.role === "ADMIN";

  useEffect(() => {
    if (!manager) return;
    const query = listCommissionDesigners();
    let active = true;
    query.then(({ data }) => { if (active) setDesigners(data); })
      .catch(() => { if (active) setError("Không tải được danh sách designer. Có thể thử mở lại yêu cầu."); });
    return () => { active = false; query.cancel(); };
  }, [manager, detail.commissionId]);

  if (!manager || ["COMPLETED", "CANCELLED", "EXPIRED"].includes(detail.status)) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || (!staffId && !designerId) || !reason.trim()) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await reassignCommission(detail.commissionId, {
        ...(staffId && { staffId: Number(staffId) }),
        ...(designerId && { designerId: Number(designerId) }),
        reason: reason.trim(),
      });
      setNotice("Đã cập nhật người phụ trách.");
      setStaffId("");
      setDesignerId("");
      setReason("");
      onChanged();
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không phân công lại được yêu cầu."));
      onChanged();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="rounded-lg border border-[#cfe3d0] bg-white p-4">
      <summary className="cursor-pointer font-semibold text-[#155e59]">Đổi người phụ trách</summary>
      <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
        <fieldset disabled={busy} className="space-y-3">
          <p>Chỉ nhập người cần thay đổi. Lý do được lưu nội bộ.</p>
          <label className="block">Mã nhân viên staff mới
            <input type="number" min={1} step={1} value={staffId} onChange={(event) => setStaffId(event.target.value)}
              className="mt-1 min-h-11 w-full rounded border border-[#819e8c] p-2" />
          </label>
          {detail.assignedDesignerId != null && <label className="block">Designer mới
            <select value={designerId} onChange={(event) => setDesignerId(event.target.value)}
              className="mt-1 min-h-11 w-full rounded border border-[#819e8c] p-2">
              <option value="">Giữ designer hiện tại</option>
              {designers.filter((item) => item.designerId !== detail.assignedDesignerId).map((item) => (
                <option key={item.designerId} value={item.designerId}>{item.fullName} (#{item.designerId})</option>
              ))}
            </select>
          </label>}
          <label className="block">Lý do thay đổi
            <textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded border border-[#819e8c] p-2" />
          </label>
          <button disabled={!reason.trim() || (!staffId && !designerId)} className="min-h-11 rounded bg-[#155e59] px-4 font-semibold text-white disabled:opacity-50">
            {busy ? "Đang lưu…" : "Lưu người phụ trách"}
          </button>
        </fieldset>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </form>
    </details>
  );
}
