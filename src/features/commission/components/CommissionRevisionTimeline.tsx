"use client";

import { useRef, useState, type FormEvent } from "react";
import { estimateCommissionRevision, type CommissionManagementDetail } from "../services/management-commission.api";
import { commissionErrorMessage } from "../errors";
import { formatPrice } from "@/lib/currency";

const statuses: Record<string, string> = {
  PENDING: "Chờ khách xác nhận", AWAITING_PAYMENT: "Chờ thanh toán", CONFIRMED: "Chờ dự kiến thời gian",
  IN_PROGRESS: "Đang sửa", COMPLETED: "Đã giao bản sửa", CANCELLED: "Đã hủy", SUPERSEDED: "Đã thay thế",
};

function date(value?: string | null) {
  if (!value) return "Chưa xác định";
  return new Date(value).toLocaleString("vi-VN");
}

export default function CommissionRevisionTimeline({
  detail,
  designer = false,
  neo = false,
  onChanged,
}: {
  detail: CommissionManagementDetail;
  designer?: boolean;
  neo?: boolean;
  onChanged: () => void;
}) {
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const revisions = detail.revisionRequests ?? [];
  const needsEstimate = designer && detail.status === "AWAITING_ESTIMATE" && revisions.some((item) => item.status === "CONFIRMED");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(hours);
    if (pending.current || !Number.isInteger(value) || value < 1 || value > 72) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await estimateCommissionRevision(detail.commissionId, value);
      onChanged();
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không lưu được thời gian dự kiến."));
      onChanged();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!revisions.length && !needsEstimate) return null;
  return (
    <section
      className={
        neo
          ? "neo-box-no-hover space-y-3 bg-white p-5 text-black"
          : "space-y-3 rounded-lg border border-studio-line bg-white p-5"
      }
    >
      <h2 className={neo ? "text-sm font-black uppercase tracking-wider text-black" : "font-bold text-studio-ink"}>
        Yêu cầu chỉnh sửa
      </h2>
      {revisions.map((item) => (
        <article
          key={item.revisionRequestId}
          className={
            neo
              ? "space-y-1.5 border-2 border-black bg-[#f7fbf8] p-3 text-sm"
              : "space-y-2 rounded-lg bg-studio-wash p-3 text-sm"
          }
        >
          <h3 className="font-black">Lần sửa {item.revisionNumber} · {statuses[item.status] ?? item.status}</h3>
          <p className="whitespace-pre-wrap break-words">{item.description}</p>
          <p className="font-semibold">{item.usesFreeQuota ? "Dùng lượt miễn phí" : formatPrice(item.revisionFee)}</p>
          {item.estimatedHours != null && <p>Dự kiến {item.estimatedHours} giờ{item.estimateSource === "SYSTEM_DEFAULT" ? " (hệ thống)" : ""}</p>}
          {item.designerDueAt && <p>Hạn designer bàn giao {date(item.designerDueAt)}</p>}
          {item.customerDueAt && <p>Hạn hiển thị cho khách {date(item.customerDueAt)}</p>}
        </article>
      ))}
      {needsEstimate && (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm">Nhập thời gian hoàn thành trong 24 giờ sau khi khách xác nhận. Hệ thống dùng mặc định 24 giờ nếu hết hạn.</p>
          <label className="block text-sm font-bold">Thời gian thực hiện (1–72 giờ)
            <input
              type="number"
              min={1}
              max={72}
              step={1}
              required
              value={hours}
              disabled={busy}
              onChange={(event) => setHours(event.target.value)}
              className={
                neo
                  ? "mt-1 block min-h-11 w-full border-2 border-black bg-white p-2 font-mono font-bold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
                  : "mt-1 block min-h-11 w-full rounded border border-studio-line p-2"
              }
            />
          </label>
          <p className="text-sm">Hạn của khách được cộng thêm 24 giờ so với hạn bàn giao của designer.</p>
          {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
          <button
            disabled={busy}
            className={
              neo
                ? "btn-primary min-h-11 text-sm font-black uppercase"
                : "min-h-11 rounded bg-studio-accent px-4 font-semibold text-white disabled:opacity-50"
            }
          >
            {busy ? "Đang lưu…" : "Xác nhận thời gian và bắt đầu sửa"}
          </button>
        </form>
      )}
    </section>
  );
}
