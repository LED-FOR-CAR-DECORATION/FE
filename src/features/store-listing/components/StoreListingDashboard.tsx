"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CheckCircle2, ChevronDown, Clock3, Cpu, EyeOff, Lock, Plus, Sparkles, Store, X } from "lucide-react";
import { apiUpdateProductStatus, fetchStoreProducts } from "@/lib/api/products";
import type { CatalogProduct } from "@/features/cart/catalog";
import { useStoreCharacters } from "../hooks/useStoreCharacters";
import type { PublishMode, StoreCharacterRow } from "../types";
import CatalogListingTable from "./CatalogListingTable";
import CharacterListingTable from "./CharacterListingTable";
import CreateStoreProductModal from "./CreateStoreProductModal";
import EditStoreProductModal, { type EditableProductData } from "./EditStoreProductModal";
import PublishVersionModal from "./PublishVersionModal";
import UnlistConfirmModal from "./UnlistConfirmModal";
import ArchiveProductConfirmModal from "./ArchiveProductConfirmModal";
import DeleteProductConfirmModal from "./DeleteProductConfirmModal";

type TabId = "characters" | "led-models" | "bundles";

type ModalState =
  | { kind: "create"; defaultType?: "LED" | "CHARACTER" }
  | { kind: "edit"; product: EditableProductData }
  | { kind: "publish"; character: StoreCharacterRow; mode: PublishMode }
  | { kind: "unlist"; character: StoreCharacterRow }
  | { kind: "archive"; productId: string | number; productName: string }
  | { kind: "delete"; productId: string | number; productName: string }
  | null;

const NOTICE_DURATION_MS = 6000;

/** Quản lý Store Listing — Dashboard dành riêng cho Manager với các user stories CRUD sản phẩm. */
export default function StoreListingDashboard() {
  const { rows, isLoading, error, retry, canManage, publish, unlist } = useStoreCharacters();
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("characters");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    characters: null,
    "led-models": null,
    bundles: null,
  });

  // Đóng menu tạo sản phẩm khi bấm ra ngoài
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    if (createMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [createMenuOpen]);

  const refreshCatalog = () => {
    fetchStoreProducts({ size: 100 })
      .then((res) => setCatalogProducts(res.items))
      .catch((err) => console.error("Failed to load catalog products:", err));
    retry();
  };

  useEffect(() => {
    refreshCatalog();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((row) => row.status === "Pending Review").length,
      published: rows.filter((row) => row.status === "Published").length,
      hidden: rows.filter((row) => row.status === "Hidden").length,
    }),
    [rows],
  );

  const tabs: { id: TabId; label: string; count: number | null }[] = [
    { id: "characters", label: "Characters", count: isLoading ? null : rows.length },
    {
      id: "led-models",
      label: "LED Models",
      count: catalogProducts.filter((product) => product.productType === "LED_MODEL").length,
    },
    {
      id: "bundles",
      label: "Bundles",
      count: catalogProducts.filter((product) => product.productType === "BUNDLE").length,
    },
  ];

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const handlePublish = async (versionId: string) => {
    if (modal?.kind !== "publish") return;
    const { character, mode } = modal;
    const updated = await publish(character.characterId, versionId);
    setModal(null);
    setNotice(
      mode === "change"
        ? `${character.name} đã được chuyển sang version ${updated.activeVersion?.versionNumber} trên Store.`
        : `${character.name} đã được publish lên Store với version ${updated.activeVersion?.versionNumber}.`,
    );
    refreshCatalog();
  };

  const handleUnlist = async () => {
    if (modal?.kind !== "unlist") return;
    const { character } = modal;
    await unlist(character.characterId);
    setModal(null);
    setNotice(`${character.name} đã được ẩn khỏi Store thành công.`);
    refreshCatalog();
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#55a96f] bg-gradient-to-br from-[#bceac8] to-[#8bd49f] shadow-[2px_2px_0_#c6e8cd]">
              <Store size={18} />
            </span>
            Quản lý Store Listing
          </h1>
          <p className="mt-1 text-sm font-medium text-text-muted">
            Quản lý danh mục sản phẩm, duyệt phiên bản, chỉnh sửa và điều chỉnh trạng thái hiển thị trên Store.
          </p>
        </div>

        {canManage && (
          <div className="relative" ref={createMenuRef}>
            <button
              type="button"
              onClick={() => setCreateMenuOpen((prev) => !prev)}
              aria-expanded={createMenuOpen}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] px-4 py-2.5 text-sm font-black text-[#10351f] shadow-[2px_2px_0_#c6e8cd] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd]"
            >
              <Plus size={16} />
              Tạo sản phẩm bày bán
              <ChevronDown size={14} className={`transition-transform ${createMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-[#cfe5d6] bg-white p-2 shadow-xl">
                <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#1e4d30]">
                  Chọn loại sản phẩm (AC02)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setModal({ kind: "create", defaultType: "LED" });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-[#143d24] transition hover:bg-[#eef8f0]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-[#e2f5e8] text-[#1c6b39]">
                    <Cpu size={15} />
                  </span>
                  <div>
                    <p className="font-black">Tạo sản phẩm LED</p>
                    <p className="text-[10px] font-normal text-text-muted">Phần cứng, model, spec & tồn kho</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setModal({ kind: "create", defaultType: "CHARACTER" });
                  }}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-[#143d24] transition hover:bg-[#eef8f0]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-[#e2f5e8] text-[#1c6b39]">
                    <Sparkles size={15} />
                  </span>
                  <div>
                    <p className="font-black">Tạo nhân vật</p>
                    <p className="text-[10px] font-normal text-text-muted">Digital character version & art</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {!canManage && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
        >
          <Lock size={15} className="shrink-0" />
          Chế độ chỉ xem: Chỉ tài khoản Manager mới có quyền tạo mới, duyệt publish, đổi version, chỉnh sửa, lưu trữ hoặc xóa mềm các sản phẩm.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Clock3 size={19} />}
          label="Chờ duyệt"
          value={isLoading ? null : counts.pending}
          helper="Đang đợi quyết định của bạn"
          tone="amber"
        />
        <SummaryCard
          icon={<CheckCircle2 size={19} />}
          label="Đã publish"
          value={isLoading ? null : counts.published}
          helper="Đang mở bán trên Store"
          tone="green"
        />
        <SummaryCard
          icon={<EyeOff size={19} />}
          label="Đã ẩn"
          value={isLoading ? null : counts.hidden}
          helper="Tạm ngừng hiển thị trên Store"
          tone="gray"
        />
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Đóng thông báo"
            className="rounded p-1 hover:bg-green-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="neo-box-no-hover overflow-hidden bg-white">
        <div
          role="tablist"
          aria-label="Các danh mục sản phẩm trên Store"
          className="flex flex-wrap items-center gap-1 border-b border-[#e3efe6] px-4 pt-3"
        >
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                  selected
                    ? "border-primary-dark text-primary-dark"
                    : "border-transparent text-text-muted hover:text-[#173b28]"
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                      selected ? "bg-primary/30 text-[#165d3a]" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === "characters" && (
            <CharacterListingTable
              rows={rows}
              isLoading={isLoading}
              error={error}
              onRetry={retry}
              canManage={canManage}
              onPublish={(character, mode) => setModal({ kind: "publish", character, mode })}
              onUnlist={(character) => setModal({ kind: "unlist", character })}
              onEdit={(character) =>
                setModal({
                  kind: "edit",
                  product: {
                    id: character.characterId,
                    productName: character.name,
                    basePrice: 199000,
                    description: character.description,
                    thumbnailUrl: character.thumbnailUrl,
                  },
                })
              }
              onArchive={(character) =>
                setModal({
                  kind: "archive",
                  productId: character.characterId,
                  productName: character.name,
                })
              }
              onDelete={(character) =>
                setModal({
                  kind: "delete",
                  productId: character.characterId,
                  productName: character.name,
                })
              }
            />
          )}
          {activeTab === "led-models" && (
            <CatalogListingTable
              kind="LED_MODEL"
              items={catalogProducts.filter((product) => product.productType === "LED_MODEL")}
              canManage={canManage}
              onEdit={(product) =>
                setModal({
                  kind: "edit",
                  product: {
                    id: product.id,
                    productName: product.name,
                    basePrice: product.price,
                    description: product.description,
                    thumbnailUrl: product.previewUrl,
                    galleryUrls: product.galleryUrls,
                    tags: product.tags,
                  },
                })
              }
              onUnlist={async (product) => {
                try {
                  await apiUpdateProductStatus(Number(product.id), "UNPUBLISHED");
                  setNotice(`Đã ẩn sản phẩm "${product.name}" khỏi Store.`);
                  refreshCatalog();
                } catch {
                  setNotice(`Ẩn sản phẩm thất bại.`);
                }
              }}
              onArchive={(product) =>
                setModal({
                  kind: "archive",
                  productId: product.id,
                  productName: product.name,
                })
              }
              onDelete={(product) =>
                setModal({
                  kind: "delete",
                  productId: product.id,
                  productName: product.name,
                })
              }
            />
          )}
          {activeTab === "bundles" && (
            <CatalogListingTable
              kind="BUNDLE"
              items={catalogProducts.filter((product) => product.productType === "BUNDLE")}
            />
          )}
        </div>
      </section>

      {modal?.kind === "create" && (
        <CreateStoreProductModal
          initialType={modal.defaultType}
          onClose={() => setModal(null)}
          onSuccess={(productName) => {
            setNotice(`Tạo sản phẩm "${productName}" thành công ở trạng thái Chưa mở bán (UNPUBLISHED).`);
            refreshCatalog();
          }}
        />
      )}

      {modal?.kind === "edit" && (
        <EditStoreProductModal
          product={modal.product}
          onClose={() => setModal(null)}
          onSuccess={(productName) => {
            setNotice(`Cập nhật thông tin sản phẩm "${productName}" thành công.`);
            refreshCatalog();
          }}
        />
      )}

      {modal?.kind === "publish" && (
        <PublishVersionModal
          key={modal.character.characterId}
          character={modal.character}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onConfirm={handlePublish}
        />
      )}

      {modal?.kind === "unlist" && (
        <UnlistConfirmModal
          character={modal.character}
          onClose={() => setModal(null)}
          onConfirm={handleUnlist}
        />
      )}

      {modal?.kind === "archive" && (
        <ArchiveProductConfirmModal
          productId={modal.productId}
          productName={modal.productName}
          onClose={() => setModal(null)}
          onSuccess={(productName) => {
            setNotice(`Đã chuyển sản phẩm "${productName}" sang trạng thái Lưu trữ (ARCHIVED).`);
            refreshCatalog();
          }}
        />
      )}

      {modal?.kind === "delete" && (
        <DeleteProductConfirmModal
          productId={modal.productId}
          productName={modal.productName}
          onClose={() => setModal(null)}
          onSuccess={(productName) => {
            setNotice(`Đã xóa mềm sản phẩm "${productName}" thành công.`);
            refreshCatalog();
          }}
        />
      )}
    </div>
  );
}

const TONE: Record<"amber" | "green" | "gray", string> = {
  amber: "bg-amber-100 text-amber-700 border-amber-300",
  green: "bg-green-100 text-green-700 border-green-300",
  gray: "bg-gray-100 text-gray-600 border-gray-300",
};

function SummaryCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  helper: string;
  tone: keyof typeof TONE;
}) {
  return (
    <div className="neo-box-no-hover bg-white p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border ${TONE[tone]}`}>{icon}</div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</p>
      {value === null ? (
        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-[#e7f3ea]" />
      ) : (
        <p className="mt-1 text-3xl font-black">{value}</p>
      )}
      <p className="mt-1 text-[11px] font-medium text-text-muted">{helper}</p>
    </div>
  );
}
