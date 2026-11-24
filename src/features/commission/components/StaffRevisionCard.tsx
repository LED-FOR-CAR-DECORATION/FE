"use client";

import { useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/currency";
import type { CommissionMessage } from "@/features/commission-chat/services/commission-messages.api";
import { commissionErrorMessage } from "../errors";
import { postRevisionCard } from "../services/management-commission.api";

const MAX_BRIEF = 2000;
/** Backend tính phí chỉnh sửa vượt lượt = 10% giá ban đầu (PostRevisionCardUseCase.EXTRA_FEE_RATE). */
const EXTRA_FEE_RATE = 0.1;

/**
 * CMS-19: staff phụ trách gửi thẻ yêu cầu chỉnh sửa (EXTRA_FEE_CARD) cho khách khi commission ở PREVIEW_DELIVERED.
 * Khách xác nhận thẻ trong phòng chat (CMS-20); nếu hết lượt miễn phí sẽ phải thanh toán thêm.
 */
export default function StaffRevisionCard({ commissionId, status, revisionsUsed, maxRevisions, initialPrice, hasPendingCard, onPosted }: {
  commissionId: number;
  status: string;
  revisionsUsed?: number;
  maxRevisions?: number;
  initialPrice?: number;
  /** Đã có thẻ mới nhất đang chờ khách xác nhận. */
  hasPendingCard: boolean;
  onPosted: (message: CommissionMessage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);

  if (status !== "PREVIEW_DELIVERED") return null;

  const freeLeft = typeof maxRevisions === "number" ? Math.max(0, maxRevisions - (revisionsUsed ?? 0)) : undefined;
  const estimatedFee = typeof initialPrice === "number" ? Math.round(initialPrice * EXTRA_FEE_RATE) : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = brief.trim();
    if (!text) return setError("Nhập nội dung cần chỉnh sửa.");
    if (text.length > MAX_BRIEF) return setError(`Tối đa ${MAX_BRIEF} ký tự.`);
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await postRevisionCard(commissionId, text);
      onPosted(data);
      setBrief("");
      setOpen(false);
      setNotice("Đã gửi thẻ yêu cầu chỉnh sửa cho khách.");
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không gửi được thẻ yêu cầu chỉnh sửa."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={`revision-card-${commissionId}`} className="space-y-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
      <h3 id={`revision-card-${commissionId}`} className="font-bold text-amber-900">Yêu cầu chỉnh sửa từ khách</h3>
      <p className="text-sm text-amber-950">
        {freeLeft === undefined ? "Khách xác nhận thẻ trong phòng chat."
          : freeLeft > 0 ? `Khách còn ${freeLeft} lượt chỉnh sửa miễn phí — thẻ này sẽ dùng 1 lượt khi khách xác nhận.`
            : `Khách đã hết lượt miễn phí — khách sẽ trả phí 10% giá ban đầu${estimatedFee !== undefined ? ` (khoảng ${formatPrice(estimatedFee)})` : ""} khi xác nhận.`}
      </p>
      {hasPendingCard && <p className="text-sm text-amber-800">Đang có một thẻ chờ khách xác nhận. Gửi thẻ mới sẽ thay thế thẻ đó.</p>}
      {notice && <p role="status" className="text-sm font-semibold text-[#155e59]">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {open ? (
        <form onSubmit={submit} className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor={`revision-brief-${commissionId}`}>Tóm tắt nội dung khách muốn sửa</label>
          <textarea id={`revision-brief-${commissionId}`} rows={4} value={brief} maxLength={MAX_BRIEF} disabled={busy}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Ví dụ: đổi màu viền sang cyan sáng hơn, làm chậm nhịp nhấp nháy của mắt."
            className="w-full rounded-lg border border-[#819e8c] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#155e59]" />
          <p className="text-right text-xs text-[#526159]">{brief.trim().length}/{MAX_BRIEF}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !brief.trim()}
              className="min-h-11 rounded-lg bg-amber-600 px-4 font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
              {busy ? "Đang gửi…" : "Gửi thẻ cho khách"}
            </button>
            <button type="button" disabled={busy} onClick={() => { setOpen(false); setError(""); }}
              className="min-h-11 rounded-lg px-4 font-semibold text-[#155e59] underline">Hủy</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setOpen(true); setNotice(""); }}
          className="min-h-11 rounded-lg border border-amber-600 px-4 font-semibold text-amber-800 hover:bg-amber-100">
          Tạo thẻ yêu cầu chỉnh sửa
        </button>
      )}
    </section>
  );
}
