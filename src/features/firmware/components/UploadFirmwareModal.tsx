"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { firmwareErrorMessage, uploadFirmware, type FirmwareModel, type UploadFirmwareResult } from "@/lib/api/firmware";
import {
  CHANGELOG_MAX,
  compareSemver,
  formatBytes,
  inspectFirmwareBinary,
  MAX_FIRMWARE_BYTES,
  SEMVER_PATTERN,
  type BinaryInspection,
} from "../binary";

type Props = {
  /** The release always goes to the model the admin opened; there is no model picker. */
  model: FirmwareModel;
  /** The model's current ACTIVE version, shown for context (undefined = none). */
  activeVersion?: string;
  /**
   * Highest version ever uploaded for the model, deprecated ones included. The backend
   * (DEV-12) rejects anything not above it with FIRMWARE_VERSION_CONFLICT.
   */
  highestVersion?: string;
  onClose: () => void;
  onUploaded: (result: UploadFirmwareResult) => void;
};

export default function UploadFirmwareModal({ model, activeVersion, highestVersion, onClose, onUploaded }: Props) {
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<BinaryInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formError, setFormError] = useState("");

  const trimmedVersion = version.trim();
  const versionFormatOk = SEMVER_PATTERN.test(trimmedVersion);
  const versionTooLow = versionFormatOk && highestVersion !== undefined && compareSemver(trimmedVersion, highestVersion) <= 0;

  const handleFile = async (selected: File | null) => {
    setFile(selected);
    setInspection(null);
    if (!selected) return;
    setInspecting(true);
    try {
      setInspection(await inspectFirmwareBinary(selected));
    } finally {
      setInspecting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!versionFormatOk) return setFormError("Phiên bản phải theo dạng MAJOR.MINOR.PATCH, ví dụ 1.3.0.");
    if (versionTooLow) return setFormError(`Phiên bản phải lớn hơn ${highestVersion}, phiên bản cao nhất từng tải lên cho mẫu này.`);
    if (!changelog.trim()) return setFormError("Nhập ghi chú thay đổi cho bản phát hành.");
    if (!file || !inspection) return setFormError("Chọn tệp firmware .bin.");
    if (!inspection.ok) return setFormError("Tệp firmware chưa hợp lệ, xem chi tiết bên dưới.");

    setSubmitting(true);
    setProgress(0);
    try {
      const result = await uploadFirmware(
        { file, modelId: model.modelId, version: trimmedVersion, changelog: changelog.trim() },
        setProgress,
      );
      onUploaded(result);
    } catch (error) {
      setFormError(firmwareErrorMessage(error, "Tải lên firmware thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="upload-firmware-title" className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 id="upload-firmware-title" className="text-base font-black text-gray-900">Tải lên firmware mới</h3>
            <p className="text-[11px] text-gray-500">
              Cho <strong className="text-gray-700">{model.modelName}</strong>. Bản tải lên sẽ trở thành bản đang phát hành duy nhất của mẫu này.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-gray-700">Bản đang phát hành</p>
                <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-bold text-gray-700">
                  {activeVersion ? `v${activeVersion}` : "Chưa có"}
                </p>
                {model.status === "DEPRECATED" && (
                  <p className="mt-1 text-[11px] text-gray-400">Mẫu đã ngừng bán vẫn nhận cập nhật cho khách đang dùng.</p>
                )}
              </div>

              <div>
                <label htmlFor="fw-version" className="text-xs font-bold text-gray-700">
                  Phiên bản <span className="text-red-500">*</span>
                </label>
                <input
                  id="fw-version"
                  type="text"
                  inputMode="decimal"
                  maxLength={32}
                  placeholder="1.3.0"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  aria-invalid={trimmedVersion !== "" && (!versionFormatOk || versionTooLow)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs font-medium text-gray-900 outline-none focus:border-[#0F5B38] aria-[invalid=true]:border-red-400"
                />
                <p className={`mt-1 text-[11px] ${trimmedVersion && (!versionFormatOk || versionTooLow) ? "text-red-600" : "text-gray-400"}`}>
                  {trimmedVersion && !versionFormatOk
                    ? "Dạng MAJOR.MINOR.PATCH, ví dụ 1.3.0."
                    : versionTooLow
                      ? `Phải lớn hơn ${highestVersion} (cao nhất từng tải lên, kể cả bản đã thu hồi).`
                      : highestVersion
                        ? `Phải lớn hơn ${highestVersion}, kể cả khi bản đó đã bị thu hồi.`
                        : "Bản đầu tiên của mẫu này."}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="fw-file" className="text-xs font-bold text-gray-700">
                Tệp firmware (.bin) <span className="text-red-500">*</span>
              </label>
              <label
                htmlFor="fw-file"
                className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/60 px-4 py-5 text-center transition hover:border-[#0F5B38] hover:bg-emerald-50/40"
              >
                <FileUp size={22} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-700">{file ? file.name : "Chọn tệp .bin"}</span>
                <span className="text-[11px] text-gray-400">Tối đa {formatBytes(MAX_FIRMWARE_BYTES)} · phải bắt đầu bằng byte 0xE9</span>
              </label>
              <input
                id="fw-file"
                type="file"
                accept=".bin,application/octet-stream"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              />

              {inspecting && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <Loader2 size={12} className="animate-spin" /> Đang kiểm tra tệp…
                </p>
              )}
              {inspection && (
                <div className={`mt-2 rounded-lg border p-3 text-[11px] ${inspection.ok ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50"}`}>
                  <p className={`flex items-center gap-1.5 font-bold ${inspection.ok ? "text-[#0F5B38]" : "text-red-700"}`}>
                    {inspection.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {inspection.ok ? "Tệp hợp lệ" : "Tệp chưa hợp lệ"}
                  </p>
                  <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-gray-600">
                    <dt>Dung lượng</dt>
                    <dd className="font-mono">{formatBytes(inspection.sizeBytes)}</dd>
                    <dt>Byte đầu</dt>
                    <dd className="font-mono">
                      {inspection.magicByte === null ? "—" : `0x${inspection.magicByte.toString(16).toUpperCase().padStart(2, "0")}`}
                    </dd>
                    {inspection.sha256 && (
                      <>
                        <dt>SHA-256</dt>
                        <dd className="break-all font-mono">{inspection.sha256}</dd>
                      </>
                    )}
                  </dl>
                  {inspection.problems.length > 0 && (
                    <ul className="mt-1.5 list-disc pl-4 font-semibold text-red-700">
                      {inspection.problems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  )}
                  {inspection.ok && <p className="mt-1.5 text-gray-500">Máy chủ sẽ tự kiểm tra lại và tính SHA-256 chính thức.</p>}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="fw-changelog" className="text-xs font-bold text-gray-700">
                Ghi chú thay đổi <span className="text-red-500">*</span>
              </label>
              <textarea
                id="fw-changelog"
                rows={4}
                maxLength={CHANGELOG_MAX}
                placeholder="Sửa lỗi nhấp nháy khi bật xi-nhan, tối ưu độ sáng ban đêm…"
                value={changelog}
                onChange={(event) => setChangelog(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-[#0F5B38]"
              />
              <p className="mt-1 text-right text-[11px] text-gray-400">
                {changelog.length}/{CHANGELOG_MAX}
              </p>
            </div>

            {submitting && (
              <div aria-live="polite">
                <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                  <span>Đang tải lên…</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-[#0F5B38] transition-[width]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || inspecting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F5B38] px-4 py-2 text-xs font-bold text-white hover:bg-[#0c4a2d] disabled:opacity-50"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Tải lên &amp; phát hành
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
