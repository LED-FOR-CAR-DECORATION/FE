"use client";

import { useRef, useState, type FormEvent } from "react";
import { getApiErrorMessage } from "@/lib/api/auth";
import { ApiError } from "@/api_client/core/ApiError";
import { postDeliverableCard, rejectCommissionDraft } from "../services/management-commission.api";

export interface ReviewableDraft {
  submissionId: number;
  versionNumber: number;
  imageUrl: string;
  designerNote?: string | null;
  designerName?: string | null;
  status: string;
}

const MAX_NOTE = 2000;

function errorMessage(failure: unknown, fallback: string) {
  const code = failure instanceof ApiError ? (failure.body as { code?: string } | undefined)?.code : undefined;
  if (code === "COMMISSION_STAFF_LOCKED") return "Commission này do staff khác phụ trách.";
  if (code === "INVALID_COMMISSION_STATUS_TRANSITION") return "Bản nháp không còn ở trạng thái chờ duyệt. Hãy tải lại.";
  return getApiErrorMessage(failure, fallback);
}

/**
 * Staff duyệt bản nháp designer gửi lên (chỉ khi commission ở INTERNAL_REVIEW):
 * - CMS-17: Duyệt & gửi Deliverable Card cho khách → PREVIEW_DELIVERED
 * - CMS-16: Trả về designer kèm ghi chú → INTERNAL_REVISION_REQUIRED
 */
export default function StaffDraftReview({ commissionId, status, drafts, onChanged }: {
  commissionId: number;
  status: string;
  drafts: ReviewableDraft[];
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "confirm" | "reject">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const draft = [...drafts]
    .filter((item) => item.status === "PENDING_STAFF_REVIEW")
    .sort((a, b) => b.versionNumber - a.versionNumber)[0];

  if (status !== "INTERNAL_REVIEW") return notice ? <p role="status" className="text-sm font-semibold text-[#155e59]">{notice}</p> : null;
  if (!draft) return <p className="text-sm text-[#526159]">Commission đang chờ duyệt nhưng chưa thấy bản nháp nào ở trạng thái chờ staff duyệt.</p>;

  async function run(action: () => Promise<unknown>, success: string, fallback: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      setNotice(success);
      setMode("idle");
      setNote("");
      onChanged();
    } catch (failure) {
      setError(errorMessage(failure, fallback));
      onChanged();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function approve() {
    void run(() => postDeliverableCard(commissionId),
      `Đã gửi bản xem trước v${draft.versionNumber} cho khách.`, "Không gửi được bản xem trước.");
  }

  function reject(event: FormEvent) {
    event.preventDefault();
    const reviewNote = note.trim();
    if (!reviewNote) return setError("Nhập ghi chú cho designer.");
    if (reviewNote.length > MAX_NOTE) return setError(`Ghi chú tối đa ${MAX_NOTE} ký tự.`);
    void run(() => rejectCommissionDraft(commissionId, { submissionId: draft.submissionId, reviewNote }),
      `Đã trả bản v${draft.versionNumber} về designer.`, "Không gửi được yêu cầu chỉnh sửa.");
  }

  const safeImage = /^https?:\/\//i.test(draft.imageUrl) ? draft.imageUrl : undefined;

  return (
    <section
      aria-labelledby={`draft-review-${commissionId}`}
      className="space-y-3 border-2 border-black bg-amber-50 p-4 shadow-[3px_3px_0_0_#000]"
    >
      <h3 id={`draft-review-${commissionId}`} className="text-sm font-black uppercase text-black">
        Duyệt bản nháp v{draft.versionNumber}{draft.designerName ? ` · ${draft.designerName}` : ""}
      </h3>
      {safeImage && (
        <a
          href={safeImage}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden border-2 border-black bg-[#0d1117]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeImage}
            alt={`Bản nháp v${draft.versionNumber}`}
            loading="lazy"
            decoding="async"
            className="h-56 w-full bg-[#0d1117] object-contain [image-rendering:pixelated]"
          />
        </a>
      )}
      {draft.designerNote && (
        <p className="whitespace-pre-wrap break-words border-2 border-black bg-white p-2.5 text-xs text-black">
          <strong>Ghi chú designer:</strong> {draft.designerNote}
        </p>
      )}

      {error && (
        <p role="alert" className="border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border-2 border-black bg-primary/20 px-3 py-2 text-xs font-bold text-primary-ink">
          {notice}
        </p>
      )}

      {mode === "reject" ? (
        <form onSubmit={reject} className="space-y-2.5 border-t-2 border-dashed border-black/30 pt-3">
          <label className="block text-xs font-black uppercase text-black" htmlFor={`review-note-${commissionId}`}>
            Cần designer sửa gì?
          </label>
          <textarea
            id={`review-note-${commissionId}`}
            rows={3}
            value={note}
            maxLength={MAX_NOTE}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
            className="w-full border-2 border-black bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ví dụ: viền neon hơi tối ở vùng nền đen, tăng tương phản và làm mượt vòng lặp."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !note.trim()}
              className="border-2 border-black bg-amber-400 px-4 py-2 text-xs font-black text-black hover:bg-amber-300 disabled:opacity-50"
            >
              {busy ? "Đang gửi…" : "Trả về designer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setError("");
              }}
              className="btn-secondary px-4 py-2 text-xs font-bold"
            >
              Hủy
            </button>
          </div>
        </form>
      ) : mode === "confirm" ? (
        <div className="space-y-2.5 border-t-2 border-dashed border-black/30 pt-3">
          <p className="text-xs font-semibold text-black">
            Khách sẽ nhận thẻ bản xem trước trong phòng chat và có 7 ngày để phản hồi trước khi commission tự hoàn thành.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={approve}
              className="btn-primary px-4 py-2 text-xs font-black disabled:opacity-50"
            >
              {busy ? "Đang gửi…" : "Xác nhận gửi cho khách"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("idle")}
              className="btn-secondary px-4 py-2 text-xs font-bold"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("confirm");
              setError("");
              setNotice("");
            }}
            className="btn-primary px-4 py-2 text-xs font-black"
          >
            Duyệt & gửi cho khách
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("reject");
              setError("");
              setNotice("");
            }}
            className="border-2 border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-amber-100"
          >
            Yêu cầu designer sửa
          </button>
        </div>
      )}
    </section>
  );
}
