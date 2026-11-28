"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, Loader2, X } from "lucide-react";
import {
  deprecateFirmware,
  fetchFirmwareReleases,
  firmwareErrorMessage,
  type DeprecateFirmwareResult,
  type FirmwareRelease,
} from "@/lib/api/firmware";
import { compareSemver, DEPRECATION_REASON_MAX } from "../binary";
import FirmwareStatusBadge from "./FirmwareStatusBadge";

type Props = {
  release: FirmwareRelease;
  onClose: () => void;
  onDeprecated: (result: DeprecateFirmwareResult) => void;
};

type RollbackPreview = { state: "loading" } | { state: "ready"; target: FirmwareRelease | null } | { state: "unknown" };

export default function DeprecateFirmwareModal({ release, onClose, onDeprecated }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const isActive = release.status === "ACTIVE";
  const [rollback, setRollback] = useState<RollbackPreview>(isActive ? { state: "loading" } : { state: "ready", target: null });

  // Preview which release DEV-13 will promote: the highest SUPERSEDED version of the same model.
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    fetchFirmwareReleases({ modelId: release.modelId, status: "SUPERSEDED", size: 100 })
      .then(({ items }) => {
        if (cancelled) return;
        const target = [...items].sort((a, b) => compareSemver(b.version, a.version))[0] ?? null;
        setRollback({ state: "ready", target });
      })
      .catch(() => !cancelled && setRollback({ state: "unknown" }));
    return () => {
      cancelled = true;
    };
  }, [isActive, release.modelId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setFormError("Nhập lý do thu hồi để lưu vào lịch sử.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      onDeprecated(await deprecateFirmware(release.firmwareId, trimmed));
    } catch (error) {
      setFormError(firmwareErrorMessage(error, "Thu hồi firmware thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="deprecate-firmware-title" className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 id="deprecate-firmware-title" className="text-base font-black text-gray-900">
            Thu hồi firmware {release.version}?
          </h3>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="font-bold text-gray-900">{release.modelName}</span>
            <span className="font-mono">v{release.version}</span>
            <FirmwareStatusBadge status={release.status} />
          </div>

          {isActive ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">Đây là bản đang phát hành. Mẫu LED sẽ quay về bản ổn định trước đó:</p>
              <div className="mt-2 flex items-center gap-2 font-mono text-[13px]">
                <span className="rounded bg-white px-2 py-0.5 line-through decoration-red-500">{release.version}</span>
                <ArrowRight size={14} />
                {rollback.state === "loading" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : rollback.state === "unknown" ? (
                  <span className="font-sans">bản cũ có phiên bản cao nhất</span>
                ) : rollback.target ? (
                  <span className="rounded bg-white px-2 py-0.5 font-bold text-[#0F5B38]">{rollback.target.version}</span>
                ) : (
                  <span className="font-sans font-semibold text-red-700">không còn bản nào</span>
                )}
              </div>
              {rollback.state === "ready" && !rollback.target && (
                <p className="mt-2">Mẫu LED này sẽ không còn bản đang phát hành. Ứng dụng sẽ báo không có cập nhật cho đến khi bạn tải lên bản mới.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600">Bản này không phải bản đang phát hành nên sẽ không có bản nào được kích hoạt thay thế.</p>
          )}

          {release.installedDeviceCount > 0 && (
            <p className="flex items-start gap-2 text-xs text-gray-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                <strong>{release.installedDeviceCount}</strong> thiết bị đang chạy bản này. Lần mở ứng dụng tiếp theo, khách hàng sẽ được đề nghị cài bản đang phát hành.
              </span>
            </p>
          )}

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="fw-reason" className="text-xs font-bold text-gray-700">
              Lý do thu hồi <span className="text-red-500">*</span>
            </label>
            <textarea
              id="fw-reason"
              rows={3}
              maxLength={DEPRECATION_REASON_MAX}
              placeholder="Ví dụ: màn hình nhấp nháy khi bật xi-nhan trên một số xe."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-[#0F5B38]"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Không thể hoàn tác. Tệp và lịch sử vẫn được giữ lại; để sửa lỗi, hãy tải lên phiên bản mới cao hơn.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || rollback.state === "loading"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Xác nhận thu hồi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
