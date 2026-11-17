"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import PixelArtStudio, {
  type PixelArtExportPayload,
} from "@/features/designer/components/PixelArtStudio";
import {
  createCharacterVersion,
  createDesignerCharacter,
  deleteDesignerCharacter,
  fetchMyCharacters,
  formatDesignerApiError,
  readFileAsDataUrl,
  updateDesignerCharacter,
  uploadDesignerAssetFile,
  type DesignerCharacterItem,
  type PaginationMeta,
} from "@/lib/api/designerCharacters";

const PAGE_SIZE = 8;

function getCharacterArtwork(character: DesignerCharacterItem): string | null {
  if (character.currentVersion?.previewGifUrl) {
    return character.currentVersion.previewGifUrl;
  }
  if (typeof window !== "undefined") {
    // 1. Direct character ID artwork
    const cached = window.localStorage.getItem(`character_artwork_${character.characterId}`);
    if (cached) return cached;

    // 2. Fallback to last studio drawing if name matches or if it's the latest created character
    const lastArtwork = window.localStorage.getItem("last_studio_artwork");
    const lastName = window.localStorage.getItem("last_studio_name");
    const lastId = window.localStorage.getItem("last_studio_character_id");

    if (lastArtwork) {
      if (lastId && Number(lastId) === character.characterId) {
        return lastArtwork;
      }
      if (lastName && lastName.toLowerCase() === character.characterName.toLowerCase()) {
        return lastArtwork;
      }
    }
  }
  return null;
}

export default function DesignerCharactersPage() {
  const [characters, setCharacters] = useState<DesignerCharacterItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Create form state
  const [characterName, setCharacterName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState<{
    message: string;
    createdId?: number;
  } | null>(null);

  // Edit state
  const [editingItem, setEditingItem] = useState<DesignerCharacterItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [versionNotice, setVersionNotice] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCharacters = useCallback(
    async (targetPage: number, queryValue: string) => {
      setLoading(true);
      setListError("");
      try {
        const res = await fetchMyCharacters({
          page: targetPage,
          size: PAGE_SIZE,
          query: queryValue || undefined,
        });
        setCharacters(res.items);
        setMeta(res.meta);
      } catch (err) {
        setListError(
          formatDesignerApiError(err, "Không thể tải danh sách nhân vật của bạn."),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCharacters(page, activeQuery);
  }, [loadCharacters, page, activeQuery]);

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating) return;

    const trimmedName = characterName.trim();
    if (!trimmedName) {
      setFormError("Vui lòng nhập tên nhân vật.");
      return;
    }
    if (trimmedName.length > 255) {
      setFormError("Tên nhân vật không được vượt quá 255 ký tự.");
      return;
    }

    setCreating(true);
    setFormError("");
    setNotice(null);

    try {
      const created = await createDesignerCharacter({
        characterName: trimmedName,
        description: description.trim() || undefined,
      });
      setCharacterName("");
      setDescription("");
      setNotice({
        message: `Đã tạo nhân vật "${created.characterName}" (#${created.characterId}) thành công.`,
        createdId: created.characterId,
      });
      setPage(0);
      await loadCharacters(0, activeQuery);
    } catch (err) {
      setFormError(
        formatDesignerApiError(err, "Không thể tạo nhân vật mới. Vui lòng thử lại."),
      );
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (item: DesignerCharacterItem) => {
    setEditingItem(item);
    setEditName(item.characterName);
    setEditDescription(item.description ?? "");
    setEditError("");
    setVersionNotice(null);
  };

  const handleUploadFileToCharacter = async (file: File) => {
    if (!editingItem) return;
    setIsUploadingVersion(true);
    setEditError("");
    setVersionNotice(null);
    try {
      const uploaded = await uploadDesignerAssetFile(file, "CHARACTER_ASSET");
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl && typeof window !== "undefined") {
        window.localStorage.setItem(`character_artwork_${editingItem.characterId}`, dataUrl);
      }
      await createCharacterVersion(editingItem.characterId, {
        previewGifUrl: uploaded.publicUrl,
        frameCount: 1,
        frameDelayMs: 100,
        byteSize: Math.max(1, file.size),
        isCurrent: true,
      });
      setVersionNotice(`Đã tải ảnh lên cho nhân vật "${editingItem.characterName}" (#${editingItem.characterId}) thành công.`);
      await loadCharacters(page, activeQuery);
    } catch (err) {
      setEditError(formatDesignerApiError(err, "Không thể tải ảnh cho nhân vật."));
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleSyncArtworkToVersion = async () => {
    if (!editingItem) return;
    const artwork = getCharacterArtwork(editingItem);
    if (!artwork) return;
    setIsUploadingVersion(true);
    setEditError("");
    setVersionNotice(null);
    try {
      const res = await fetch(artwork);
      const blob = await res.blob();
      const file = new File([blob], `${editingItem.characterName}.png`, { type: "image/png" });
      const uploaded = await uploadDesignerAssetFile(file, "CHARACTER_ASSET");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`character_artwork_${editingItem.characterId}`, artwork);
      }
      await createCharacterVersion(editingItem.characterId, {
        previewGifUrl: uploaded.publicUrl,
        frameCount: 1,
        frameDelayMs: 100,
        byteSize: Math.max(1, file.size),
        isCurrent: true,
      });
      setVersionNotice("Đã lưu bản vẽ thành phiên bản v1 cho nhân vật!");
      await loadCharacters(page, activeQuery);
    } catch (err) {
      setEditError(formatDesignerApiError(err, "Không thể lưu bản vẽ thành phiên bản."));
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingItem || savingEdit) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("Tên nhân vật không được để trống.");
      return;
    }
    if (trimmedName.length > 255) {
      setEditError("Tên nhân vật không được vượt quá 255 ký tự.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const updated = await updateDesignerCharacter(editingItem.characterId, {
        characterName: trimmedName,
        description: editDescription.trim() || undefined,
      });
      setEditingItem(null);
      setNotice({
        message: `Đã cập nhật nhân vật "${updated.characterName}" (#${updated.characterId}).`,
      });
      await loadCharacters(page, activeQuery);
    } catch (err) {
      setEditError(
        formatDesignerApiError(err, "Cập nhật thông tin nhân vật thất bại."),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (item: DesignerCharacterItem) => {
    if (deletingId !== null) return;
    const confirmed = window.confirm(
      `Bạn xác nhận muốn xóa nhân vật "${item.characterName}" (#${item.characterId})? Thao tác này sẽ xóa các phiên bản chưa lên cửa hàng của nhân vật.`,
    );
    if (!confirmed) return;

    setDeletingId(item.characterId);
    setListError("");
    setNotice(null);

    try {
      await deleteDesignerCharacter(item.characterId);
      setNotice({
        message: `Đã xóa nhân vật "${item.characterName}" (#${item.characterId}).`,
      });
      const nextPage = characters.length === 1 && page > 0 ? page - 1 : page;
      setPage(nextPage);
      await loadCharacters(nextPage, activeQuery);
    } catch (err) {
      setListError(
        formatDesignerApiError(err, "Không thể xóa nhân vật này."),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setActiveQuery(searchInput.trim());
  };

  const handleStudioSaved = useCallback(
    (payload: PixelArtExportPayload) => {
      setNotice({
        message: `Đã vẽ và lưu nhân vật "${payload.characterName}"${
          payload.characterId ? ` (#${payload.characterId})` : ""
        } từ Pixel Art Studio.`,
        createdId: payload.characterId,
      });
      setPage(0);
      void loadCharacters(0, activeQuery);
    },
    [activeQuery, loadCharacters],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#198653]">
            Không gian làm việc của nhà thiết kế
          </p>
          <h1 className="mt-1 text-3xl font-black text-[#173b28]">Tạo nhân vật</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#66736b]">
            Vẽ trực tiếp pixel art bằng <span className="font-semibold text-[#173b28]">Pixel Art Studio</span> hoặc khởi tạo hồ sơ nhân vật gốc, sau đó chuyển sang mục{" "}
            <span className="font-semibold text-[#173b28]">Đăng tải cho cửa hàng</span> để cập nhật phiên bản cho Manager đưa lên Store.
          </p>
        </div>
        <Link
          href="/designer/store-uploads"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cfe3d0] bg-white px-4 py-2.5 text-sm font-bold text-[#155e59] shadow-sm transition hover:bg-[#edf7ef]"
        >
          <Store size={16} />
          Đăng tải cho cửa hàng
        </Link>
      </header>

      <PixelArtStudio onCharacterSaved={handleStudioSaved} />

      {notice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#b7d9be] bg-[#edf7ef] px-4 py-3 text-sm font-semibold text-[#155e59]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={17} className="shrink-0 text-[#198653]" />
            {notice.message}
          </span>
          {notice.createdId && (
            <Link
              href={`/designer/store-uploads?characterId=${notice.createdId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#198653] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#12633f]"
            >
              <Store size={14} />
              Tải phiên bản lên ngay
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create Character Form Card */}
        <section className="h-fit rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#e5eee6] pb-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf7ef] text-[#198653]">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="font-black text-[#173b28]">Khởi tạo nhân vật mới</h2>
              <p className="text-xs text-[#66736b]">
                Tạo hồ sơ gốc trước khi tải file animation
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                Tên nhân vật <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                maxLength={255}
                placeholder="Ví dụ: Neon Samurai"
                className="mt-1.5 w-full rounded-xl border border-[#dce8df] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#198653]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                Mô tả nhân vật
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Phong cách pixel art, chủ đề, gợi ý hiển thị trên LED kính xe..."
                className="mt-1.5 w-full resize-y rounded-xl border border-[#dce8df] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#198653]"
              />
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
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#198653] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#12633f] disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? "Đang tạo nhân vật..." : "Tạo nhân vật"}
            </button>
          </form>
        </section>

        {/* Character Catalog List */}
        <section className="flex flex-col rounded-2xl border border-[#dce8df] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#e5eee6] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-[#173b28]">
                Danh sách nhân vật của bạn ({meta.totalElements})
              </h2>
              <p className="mt-0.5 text-xs text-[#66736b]">
                Quản lý các nhân vật gốc đã tạo và theo dõi số phiên bản đã đăng tải
              </p>
            </div>

            <div className="flex items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
                <label className="flex items-center gap-2 rounded-xl border border-[#dce8df] px-3 py-1.5">
                  <Search size={14} className="text-[#7a8c80]" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm tên nhân vật..."
                    className="w-40 bg-transparent text-xs outline-none sm:w-48"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl border border-[#cfe3d0] px-3 py-1.5 text-xs font-bold text-[#155e59] hover:bg-[#edf7ef]"
                >
                  Tìm
                </button>
              </form>
              <button
                type="button"
                onClick={() => void loadCharacters(page, activeQuery)}
                disabled={loading}
                aria-label="Làm mới danh sách"
                className="rounded-xl border border-[#dce8df] p-2 text-[#66736b] hover:bg-[#f6fbf7] hover:text-[#173b28]"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
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

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-[#66736b]">
              <Loader2 size={18} className="animate-spin text-[#198653]" />
              Đang tải danh sách nhân vật...
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#198653]">
                <Palette size={22} />
              </span>
              <p className="mt-3 font-bold text-[#173b28]">
                {activeQuery
                  ? "Không tìm thấy nhân vật phù hợp"
                  : "Bạn chưa tạo nhân vật nào"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-[#66736b]">
                {activeQuery
                  ? "Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm."
                  : "Sử dụng biểu mẫu bên trái để khởi tạo hồ sơ nhân vật pixel art đầu tiên."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef3ef]">
              {characters.map((item) => (
                <article
                  key={item.characterId}
                  className="flex flex-col gap-4 p-5 transition hover:bg-[#fbfdfb] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#dce8df] bg-[#0f1713]">
                      {getCharacterArtwork(item) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getCharacterArtwork(item)!}
                          alt={item.characterName}
                          className="h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <Palette size={22} className="text-[#89c89b]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[#edf7ef] px-2 py-0.5 text-[11px] font-black text-[#155e59]">
                          #{item.characterId}
                        </span>
                        <h3 className="truncate text-base font-black text-[#173b28]">
                          {item.characterName}
                        </h3>
                        {item.currentVersion ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            Bản hiện hành v{item.currentVersion.versionNumber}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                            Chưa có phiên bản GIF
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#66736b]">
                        {item.description || "Chưa có mô tả chi tiết cho nhân vật này."}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#7a8c80]">
                        <span>Tổng phiên bản: {item.totalVersions}</span>
                        <span>·</span>
                        <span>
                          Tạo ngày{" "}
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/designer/store-uploads?characterId=${item.characterId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#198653] px-3 py-2 text-xs font-bold text-white hover:bg-[#12633f]"
                    >
                      <Store size={13} />
                      Đăng tải cho cửa hàng
                    </Link>

                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#dce8df] bg-white px-2.5 py-2 text-xs font-bold text-[#26352f] hover:bg-[#f6fbf7]"
                    >
                      <Edit3 size={13} />
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingId === item.characterId}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === item.characterId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#e5eee6] px-5 py-3 text-xs text-[#66736b]">
              <span>
                Trang {meta.page + 1} / {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!meta.hasPrevious || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-[#dce8df] px-3 py-1.5 font-bold text-[#26352f] disabled:opacity-40"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  disabled={!meta.hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-[#dce8df] px-3 py-1.5 font-bold text-[#26352f] disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Edit Character Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-character-title"
        >
          <div className="relative flex flex-col w-full max-w-lg max-h-[90vh] rounded-2xl border border-[#dce8df] bg-white shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#e5eee6] bg-[#f8fcf8] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf7ef] text-[#198653]">
                  <Edit3 size={16} />
                </span>
                <div>
                  <h2 id="edit-character-title" className="text-base font-black text-[#173b28]">
                    Chỉnh sửa nhân vật #{editingItem.characterId}
                  </h2>
                  <p className="text-[11px] text-[#66736b]">
                    Xem ảnh minh họa, cập nhật thông tin và quản lý phiên bản
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                aria-label="Đóng"
                className="rounded-lg p-1 text-[#66736b] hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {/* Artwork Preview Display */}
              <div className="rounded-xl border border-[#dce8df] bg-[#0f1713] p-4 text-center">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#89c89b] flex items-center justify-center gap-1.5">
                  <Palette size={13} /> Hình ảnh hiển thị Pixel Art
                </p>

                {getCharacterArtwork(editingItem) ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-xl border border-[#198653]/40 bg-black/60 p-2 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCharacterArtwork(editingItem)!}
                        alt={editingItem.characterName}
                        className="max-h-full max-w-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {editingItem.currentVersion ? (
                        <span className="rounded-full bg-[#198653]/20 border border-[#198653]/50 px-2.5 py-0.5 text-[11px] font-bold text-[#89c89b]">
                          Phiên bản v{editingItem.currentVersion.versionNumber}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-900/40 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                          Bản vẽ từ Pixel Art Studio
                        </span>
                      )}
                      <Link
                        href={`/designer/store-uploads?characterId=${editingItem.characterId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-white/20 transition"
                      >
                        <Store size={11} /> Đăng tải lên Store
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-gray-400">
                    <Palette size={32} className="text-[#89c89b] mb-2" />
                    <p className="text-xs font-bold text-gray-300">Nhân vật này chưa có bản vẽ GIF/ảnh</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                      Bạn có thể vẽ trực tiếp trên bảng vẽ Studio ở trên hoặc chọn file ảnh từ máy tính bên dưới.
                    </p>
                  </div>
                )}

                {/* Upload or Sync Action inside modal */}
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-3">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#198653] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#12633f] transition">
                    {isUploadingVersion ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {isUploadingVersion ? "Đang xử lý..." : "Tải ảnh từ máy tính lên"}
                    <input
                      type="file"
                      accept="image/png,image/gif,image/jpeg,image/webp"
                      disabled={isUploadingVersion}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadFileToCharacter(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {getCharacterArtwork(editingItem) && !editingItem.currentVersion && (
                    <button
                      type="button"
                      disabled={isUploadingVersion}
                      onClick={handleSyncArtworkToVersion}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition"
                    >
                      <Sparkles size={13} />
                      Đăng ký bản vẽ thành phiên bản v1
                    </button>
                  )}
                </div>
              </div>

              {versionNotice && (
                <div className="rounded-xl border border-[#b7d9be] bg-[#edf7ef] p-3 text-xs font-semibold text-[#155e59] flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-[#198653]" />
                  {versionNotice}
                </div>
              )}

              {/* Form Metadata */}
              <form onSubmit={handleSaveEdit} id="edit-character-form" className="flex flex-col gap-3.5">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                    Tên nhân vật <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={255}
                    className="mt-1 w-full rounded-xl border border-[#dce8df] px-3.5 py-2.5 text-sm outline-none focus:border-[#198653]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-[#26352f]">
                    Mô tả nhân vật
                  </span>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-y rounded-xl border border-[#dce8df] px-3.5 py-2 text-sm outline-none focus:border-[#198653]"
                  />
                </label>

                {editError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"
                  >
                    {editError}
                  </p>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#e5eee6] bg-[#f8fcf8] px-5 py-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-xl border border-[#dce8df] bg-white px-4 py-2 text-xs font-bold text-[#26352f] hover:bg-[#f6fbf7]"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="edit-character-form"
                disabled={savingEdit || isUploadingVersion}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#198653] px-4 py-2 text-xs font-bold text-white hover:bg-[#12633f] disabled:opacity-60"
              >
                {savingEdit && <Loader2 size={14} className="animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

