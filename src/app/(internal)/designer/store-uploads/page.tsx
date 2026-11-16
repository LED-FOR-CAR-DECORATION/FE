"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Info,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createCharacterVersion,
  deleteCharacterVersion,
  fetchCharacterVersions,
  fetchMyCharacters,
  formatDesignerApiError,
  uploadDesignerAssetFile,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function StoreUploadsWorkspace() {
  const searchParams = useSearchParams();
  const initialCharacterParam = searchParams.get("characterId");

  const [characters, setCharacters] = useState<DesignerCharacterItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [loadingCharacters, setLoadingCharacters] = useState(true);

  const [versions, setVersions] = useState<CharacterVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Version upload form
  const [previewGifUrl, setPreviewGifUrl] = useState("");
  const [localPreviewDataUrl, setLocalPreviewDataUrl] = useState<string | undefined>();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadHint, setUploadHint] = useState("");
  const [frameCount, setFrameCount] = useState("16");
  const [frameDelayMs, setFrameDelayMs] = useState("100");
  const [byteSize, setByteSize] = useState("65536");
  const [isCurrent, setIsCurrent] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingVersionId, setDeletingVersionId] = useState<number | null>(null);

  const loadCharacters = useCallback(
    async (preferCharacterId?: number | null) => {
      setLoadingCharacters(true);
      try {
        const res = await fetchMyCharacters({ page: 0, size: 50 });
        setCharacters(res.items);

        setSelectedCharacterId((prev) => {
          const targetId = preferCharacterId ?? prev;
          if (
            targetId &&
            res.items.some((item) => item.characterId === targetId)
          ) {
            return targetId;
          }
          return res.items[0]?.characterId ?? null;
        });
      } catch (err) {
        setListError(
          formatDesignerApiError(err, "Không thể tải danh sách nhân vật."),
        );
      } finally {
        setLoadingCharacters(false);
      }
    },
    [],
  );

  const loadVersions = useCallback(async (charId: number) => {
    setLoadingVersions(true);
    setListError("");
    try {
      const data = await fetchCharacterVersions(charId);
      setVersions([...data].sort((a, b) => b.versionNumber - a.versionNumber));
    } catch (err) {
      setListError(
        formatDesignerApiError(err, "Không thể tải danh sách phiên bản."),
      );
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    const parsed = initialCharacterParam ? Number(initialCharacterParam) : null;
    void loadCharacters(Number.isFinite(parsed) && parsed ? parsed : null);
  }, [initialCharacterParam, loadCharacters]);

  useEffect(() => {
    if (selectedCharacterId) {
      void loadVersions(selectedCharacterId);
    } else {
      setVersions([]);
    }
  }, [loadVersions, selectedCharacterId]);

  const selectedCharacter = useMemo(
    () =>
      characters.find((item) => item.characterId === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setFormError("");
    setUploadHint("");
    setUploadingFile(true);

    try {
      const uploaded = await uploadDesignerAssetFile(file, "CHARACTER_ASSET");
      setPreviewGifUrl(uploaded.publicUrl);
      setLocalPreviewDataUrl(uploaded.previewUrl);
      setByteSize(String(file.size));
      setUploadHint(
        uploaded.usedFallback
          ? `Đã chọn file "${file.name}" (${formatFileSize(file.size)}) và tạo URL mẫu cục bộ.`
          : `Đã tải "${file.name}" (${formatFileSize(file.size)}) lên CDN thành công.`,
      );
    } catch (err) {
      setFormError(
        formatDesignerApiError(err, "Không thể tải tệp hình ảnh lên hệ thống."),
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUploadVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCharacterId || submitting) return;

    const cleanUrl = previewGifUrl.trim();
    if (!cleanUrl) {
      setFormError("Vui lòng tải lên tệp GIF/ảnh hoặc nhập URL xem trước.");
      return;
    }
    if (cleanUrl.length > 500 || !isValidHttpUrl(cleanUrl)) {
      setFormError("URL xem trước phải bắt đầu bằng http:// hoặc https:// và tối đa 500 ký tự.");
      return;
    }

    const parsedFrames = Number(frameCount);
    const parsedDelay = Number(frameDelayMs);
    const parsedBytes = Number(byteSize);

    if (!Number.isInteger(parsedFrames) || parsedFrames <= 0) {
      setFormError("Số khung hình (frameCount) phải là số nguyên lớn hơn 0.");
      return;
    }
    if (!Number.isInteger(parsedDelay) || parsedDelay <= 0) {
      setFormError("Thời gian mỗi khung hình (frameDelayMs) phải là số nguyên lớn hơn 0.");
      return;
    }
    if (!Number.isInteger(parsedBytes) || parsedBytes <= 0) {
      setFormError("Dung lượng byte (byteSize) phải là số nguyên lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setNotice("");

    try {
      const created = await createCharacterVersion(selectedCharacterId, {
        previewGifUrl: cleanUrl,
        frameCount: parsedFrames,
        frameDelayMs: parsedDelay,
        byteSize: parsedBytes,
        isCurrent,
      });

      setNotice(
        `Đã đăng tải phiên bản v${created.versionNumber} (Version ID #${created.versionId}) cho "${selectedCharacter?.characterName}". Manager có thể chọn phiên bản này để đưa lên cửa hàng.`,
      );
      setPreviewGifUrl("");
      setLocalPreviewDataUrl(undefined);
      setUploadHint("");
      await Promise.all([
        loadVersions(selectedCharacterId),
        loadCharacters(selectedCharacterId),
      ]);
    } catch (err) {
      setFormError(
        formatDesignerApiError(err, "Đăng tải phiên bản lên hệ thống thất bại."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVersion = async (version: CharacterVersionItem) => {
    if (!selectedCharacterId || deletingVersionId !== null) return;
    if (version.isListedOnStore) return;

    const confirmed = window.confirm(
      `Bạn xác nhận muốn xóa phiên bản v${version.versionNumber} (#${version.versionId})?`,
    );
    if (!confirmed) return;

    setDeletingVersionId(version.versionId);
    setListError("");
    setNotice("");

    try {
      await deleteCharacterVersion(selectedCharacterId, version.versionId);
      setNotice(
        `Đã xóa phiên bản v${version.versionNumber} (#${version.versionId}).`,
      );
      await Promise.all([
        loadVersions(selectedCharacterId),
        loadCharacters(selectedCharacterId),
      ]);
    } catch (err) {
      setListError(
        formatDesignerApiError(err, "Không thể xóa phiên bản này."),
      );
    } finally {
      setDeletingVersionId(null);
    }
  };

  const activePreviewSrc = localPreviewDataUrl || (isValidHttpUrl(previewGifUrl) ? previewGifUrl.trim() : "");

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#198653]">
            Không gian làm việc của nhà thiết kế
          </p>
          <h1 className="mt-1 text-3xl font-black text-[#173b28]">
            Đăng tải cho cửa hàng
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#66736b]">
            Chọn nhân vật gốc và đăng tải các phiên bản animation (GIF, thông số khung hình) lên hệ thống.
            Manager sẽ sử dụng các phiên bản này để định giá và mở bán trên Store.
          </p>
        </div>

        <Link
          href="/designer/characters"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cfe3d0] bg-white px-4 py-2.5 text-sm font-bold text-[#155e59] shadow-sm transition hover:bg-[#edf7ef]"
        >
          <Palette size={16} />
          Quản lý / Tạo nhân vật
        </Link>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs font-medium text-blue-900">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />

      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#b7d9be] bg-[#edf7ef] px-4 py-3 text-sm font-semibold text-[#155e59]"
        >
          <CheckCircle2 size={17} className="shrink-0 text-[#198653]" />
          {notice}
        </div>
      )}

      {/* Character Selector Card */}
      <section className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                Chọn nhân vật để đăng tải phiên bản
              </span>
              {loadingCharacters ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-[#66736b]">
                  <Loader2 size={14} className="animate-spin text-[#198653]" />
                  Đang tải danh sách nhân vật...
                </div>
              ) : characters.length === 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
                  <span>Bạn chưa có nhân vật nào trong hệ thống. Hãy tạo nhân vật trước khi tải phiên bản lên cửa hàng.</span>
                  <Link
                    href="/designer/characters"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#198653] px-3 py-1.5 font-bold text-white hover:bg-[#12633f]"
                  >
                    <Plus size={13} />
                    Tạo nhân vật ngay
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedCharacterId ?? ""}
                  onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
                  className="mt-1.5 w-full max-w-xl rounded-xl border border-[#dce8df] bg-white px-3.5 py-2.5 text-sm font-bold text-[#173b28] outline-none focus:border-[#198653]"
                >
                  {characters.map((char) => (
                    <option key={char.characterId} value={char.characterId}>
                      #{char.characterId} · {char.characterName} ({char.totalVersions} phiên bản)
                    </option>
                  ))}
                </select>
              )}
            </label>

            {selectedCharacter && (
              <p className="mt-2 text-xs text-[#66736b]">
                {selectedCharacter.description || "Nhân vật chưa có mô tả chi tiết."}
              </p>
            )}
          </div>

          {selectedCharacter && (
            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-[#e5eee6] bg-[#f8fcf8] px-4 py-3 text-xs">
              <div>
                <p className="font-bold text-[#66736b]">Mã nhân vật</p>
                <p className="mt-0.5 text-base font-black text-[#173b28]">
                  #{selectedCharacter.characterId}
                </p>
              </div>
              <div className="h-8 w-px bg-[#dce8df]" />
              <div>
                <p className="font-bold text-[#66736b]">Số phiên bản</p>
                <p className="mt-0.5 text-base font-black text-[#198653]">
                  {selectedCharacter.totalVersions}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedCharacterId !== null && (
        <div className="grid gap-6 lg:grid-cols-[410px_1fr]">
          {/* Upload Version Form */}
          <section className="h-fit rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#e5eee6] pb-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf7ef] text-[#198653]">
                <Store size={16} />
              </span>
              <div>
                <h2 className="font-black text-[#173b28]">Đăng tải phiên bản mới</h2>
                <p className="text-xs text-[#66736b]">
                  Tải tệp GIF / ảnh pixel art và thông số khung hình
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadVersion} className="mt-4 flex flex-col gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                  Tải tệp từ máy tính (GIF / PNG / WEBP / JPG)
                </span>
                <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#b7d9be] bg-[#f8fcf8] px-4 py-6 text-center transition hover:border-[#198653]">
                  {uploadingFile ? (
                    <Loader2 size={24} className="animate-spin text-[#198653]" />
                  ) : (
                    <Upload size={22} className="text-[#198653]" />
                  )}
                  <span className="text-xs font-bold text-[#173b28]">
                    {uploadingFile ? "Đang tải tệp lên hệ thống..." : "Nhấn để chọn tệp GIF / ảnh"}
                  </span>
                  <span className="text-[11px] text-[#66736b]">Tối đa 10MB</span>
                  <input
                    type="file"
                    accept="image/gif,image/png,image/webp,image/jpeg"
                    className="sr-only"
                    disabled={uploadingFile}
                    onChange={(e) => void handleFileSelected(e.target.files?.[0])}
                  />
                </label>
                {uploadHint && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#155e59]">
                    {uploadHint}
                  </p>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                  URL GIF / Ảnh xem trước <span className="text-red-500">*</span>
                </span>
                <input
                  type="url"
                  value={previewGifUrl}
                  onChange={(e) => {
                    setPreviewGifUrl(e.target.value);
                    setLocalPreviewDataUrl(undefined);
                  }}
                  maxLength={500}
                  placeholder="https://cdn.lumintra.com/characters/samurai-v1.gif"
                  className="mt-1.5 w-full rounded-xl border border-[#dce8df] px-3.5 py-2 text-sm outline-none focus:border-[#198653]"
                />
              </label>

              {activePreviewSrc && (
                <div className="rounded-xl border border-[#dce8df] bg-[#0f1713] p-3 text-center">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#89c89b]">
                    Mô phỏng hiển thị LED Pixel
                  </p>
                  <img
                    src={activePreviewSrc}
                    alt="Xem trước nhân vật"
                    className="mx-auto max-h-44 rounded-lg object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <label className="block">
                  <span className="text-[11px] font-black text-[#26352f]">
                    Số frame *
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={frameCount}
                    onChange={(e) => setFrameCount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#dce8df] px-3 py-2 text-sm outline-none focus:border-[#198653]"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black text-[#26352f]">
                    Delay (ms) *
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={frameDelayMs}
                    onChange={(e) => setFrameDelayMs(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#dce8df] px-3 py-2 text-sm outline-none focus:border-[#198653]"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black text-[#26352f]">
                    Bytes *
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={byteSize}
                    onChange={(e) => setByteSize(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#dce8df] px-3 py-2 text-sm outline-none focus:border-[#198653]"
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#f8fcf8] px-3 py-2.5 text-xs font-bold text-[#26352f]">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#198653]"
                />
                Đặt làm phiên bản hiện hành mới nhất của nhân vật
              </label>

              {formError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || uploadingFile}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#198653] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#12633f] disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {submitting
                  ? "Đang đăng tải..."
                  : "Đăng tải phiên bản lên hệ thống"}
              </button>
            </form>
          </section>

          {/* Versions Table */}
          <section className="flex flex-col overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e5eee6] px-5 py-4">
              <div>
                <h2 className="font-black text-[#173b28]">
                  Các phiên bản đã đăng tải ({versions.length})
                </h2>
                <p className="mt-0.5 text-xs text-[#66736b]">
                  Danh sách file phiên bản của "{selectedCharacter?.characterName}" trên hệ thống
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadVersions(selectedCharacterId)}
                disabled={loadingVersions}
                aria-label="Làm mới danh sách phiên bản"
                className="rounded-xl border border-[#dce8df] p-2 text-[#66736b] hover:bg-[#f6fbf7]"
              >
                <RefreshCw
                  size={14}
                  className={loadingVersions ? "animate-spin" : ""}
                />
              </button>
            </div>

            {listError && (
              <div
                role="alert"
                className="m-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
              >
                <AlertCircle size={15} className="shrink-0" />
                {listError}
              </div>
            )}

            {loadingVersions ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-[#66736b]">
                <Loader2 size={18} className="animate-spin text-[#198653]" />
                Đang tải lịch sử phiên bản...
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#198653]">
                  <Film size={22} />
                </span>
                <p className="mt-3 font-bold text-[#173b28]">
                  Chưa có phiên bản nào được đăng tải
                </p>
                <p className="mt-1 max-w-sm text-xs text-[#66736b]">
                  Tải lên file GIF hoặc nhập URL ở biểu mẫu bên trái để Manager có thể đưa nhân vật lên cửa hàng.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-[#f6fbf7]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-[#7a8c80]">
                        Version ID
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-[#7a8c80]">
                        Xem trước
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-[#7a8c80]">
                        Phiên bản & Thông số
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-[#7a8c80]">
                        Trạng thái cửa hàng (Manager)
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-[#7a8c80]">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef3ef]">
                    {versions.map((ver) => (
                      <tr key={ver.versionId} className="hover:bg-[#fbfdfb]">
                        <td className="px-4 py-4 align-top">
                          <span className="inline-block rounded-md bg-[#edf7ef] px-2 py-1 text-xs font-black text-[#155e59]">
                            #{ver.versionId}
                          </span>
                          <p className="mt-1.5 text-[11px] text-[#7a8c80]">
                            {ver.createdAt
                              ? new Date(ver.createdAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-[#dce8df] bg-[#0f1713]">
                            <img
                              src={ver.previewGifUrl}
                              alt={`Phiên bản v${ver.versionNumber}`}
                              className="h-full w-full object-contain"
                              style={{ imageRendering: "pixelated" }}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-[#173b28]">
                              v{ver.versionNumber}
                            </span>
                            {ver.isCurrent && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                Bản hiện hành
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#66736b]">
                            {ver.frameCount} khung hình · {ver.frameDelayMs} ms/khung ·{" "}
                            {formatFileSize(ver.byteSize)}
                          </p>
                          <p
                            className="mt-1 max-w-[230px] truncate text-[11px] text-[#7a8c80]"
                            title={ver.previewGifUrl}
                          >
                            {ver.previewGifUrl}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          {ver.isListedOnStore ? (
                            <div>
                              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                Đã đưa lên Store
                              </span>
                              <p className="mt-1 text-[11px] text-[#66736b]">
                                SP #{ver.productId ?? "—"} ·{" "}
                                {ver.productStatus ?? "PUBLISHED"}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                              Chờ Manager sử dụng
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right align-top">
                          <button
                            type="button"
                            onClick={() => void handleDeleteVersion(ver)}
                            disabled={
                              ver.isListedOnStore || deletingVersionId === ver.versionId
                            }
                            title={
                              ver.isListedOnStore
                                ? "Phiên bản đã được Manager đưa lên Store, không thể xóa"
                                : "Xóa phiên bản chưa lên cửa hàng"
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                          >
                            {deletingVersionId === ver.versionId ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Xóa phiên bản
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function DesignerStoreUploadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-[#66736b]">
          Đang tải không gian đăng tải...
        </div>
      }
    >
      <StoreUploadsWorkspace />
    </Suspense>
  );
}

