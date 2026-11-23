"use client";

import { useRef, useState, type FormEvent } from "react";
import { uploadMediaFile } from "@/lib/api/media";
import { commissionErrorMessage } from "../errors";
import { uploadCommissionDraft } from "../services/management-commission.api";

export default function CommissionDraftUpload({ commissionId, onUploaded }: { commissionId: number; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("draft");
    if (!(file instanceof File) || file.size === 0) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const uploaded = await uploadMediaFile(file, "COMMISSION_DRAFT", commissionId);
      if (uploaded.localPreviewUrl) URL.revokeObjectURL(uploaded.localPreviewUrl);
      if (!uploaded.objectKey) throw new Error("Không nhận được mã bản nháp.");
      await uploadCommissionDraft(commissionId, { imageUrl: uploaded.objectKey, designerNote: String(data.get("note") ?? "").trim() || undefined });
      setNotice("Đã nộp bản nháp cho staff duyệt.");
      form.reset();
      onUploaded();
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không nộp được bản nháp."));
      onUploaded();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="rounded-md border border-studio-line bg-white p-4">
      <summary className="cursor-pointer font-semibold text-studio-ink">Nộp bản nháp từ tệp ảnh</summary>
      <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
        <fieldset disabled={busy} className="space-y-3">
          <label className="block">Ảnh PNG, JPG, WEBP hoặc GIF (tối đa 10 MB)
            <input name="draft" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="mt-1 block w-full rounded border border-studio-line p-2" />
          </label>
          <label className="block">Ghi chú cho staff
            <textarea name="note" maxLength={2000} className="mt-1 w-full rounded border border-studio-line p-2" />
          </label>
          <button className="min-h-11 rounded bg-studio-accent px-4 font-semibold text-white">{busy ? "Đang nộp…" : "Nộp cho staff duyệt"}</button>
        </fieldset>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </form>
    </details>
  );
}
