"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CheckCircle2, Clock3, Cpu, Crown, EyeOff, Lock, Package, Plus, Sparkles, Store, X } from "lucide-react";
import { apiUpdateProductStatus, apiUpdateStoreProduct, fetchStoreProducts } from "@/lib/api/products";
import { useStoreCharacters } from "../hooks/useStoreCharacters";
import {
  getCreatedStoreProducts,
  updateCreatedStoreProductStatus,
} from "../services/store-listing.service";
import type { PublishMode, StoreCharacterRow } from "../types";
import CatalogListingTable, { type StoreCatalogItem } from "./CatalogListingTable";
import CharacterListingTable from "./CharacterListingTable";
import CreateStoreProductModal from "./CreateStoreProductModal";
import CreateCharacterProductModal from "./CreateCharacterProductModal";
import EditStoreProductModal, { type EditableProductData } from "./EditStoreProductModal";
import PublishVersionModal from "./PublishVersionModal";
import UnlistConfirmModal from "./UnlistConfirmModal";
import ArchiveProductConfirmModal from "./ArchiveProductConfirmModal";
import DeleteProductConfirmModal from "./DeleteProductConfirmModal";
import ManagerProductListingTable from "./ManagerProductListingTable";
import BundleListingTable from "./BundleListingTable";
import CreateBundleModal from "./CreateBundleModal";
import EditBundleModal from "./EditBundleModal";
import DeleteBundleConfirmModal from "./DeleteBundleConfirmModal";
import SubscriptionListingTable from "./SubscriptionListingTable";
import CreateSubscriptionModal from "./CreateSubscriptionModal";
import EditSubscriptionModal from "./EditSubscriptionModal";
import { fetchManagedBundles, type ManagedBundleItem } from "@/lib/api/bundles";
import {
  fetchManagedSubscriptions,
  type ManagedSubscriptionPlan,
} from "@/lib/api/subscriptions";

type TabId = "characters" | "approval-queue" | "led-models" | "bundles" | "subscriptions";

type ModalState =
  | { kind: "create" }
  | { kind: "create-character" }
  | { kind: "edit"; product: EditableProductData }
  | { kind: "publish"; character: StoreCharacterRow; mode: PublishMode }
  | { kind: "unlist"; character: StoreCharacterRow }
  | { kind: "archive"; productId: string | number; productName: string }
  | { kind: "delete"; productId: string | number; productName: string }
  | { kind: "create-bundle" }
  | { kind: "edit-bundle"; bundle: ManagedBundleItem }
  | { kind: "delete-bundle"; bundle: ManagedBundleItem }
  | { kind: "create-subscription" }
  | { kind: "edit-subscription"; plan: ManagedSubscriptionPlan }
  | null;

const NOTICE_DURATION_MS = 6000;

/** Quản lý Store Listing — Dashboard dành riêng cho Manager với các user stories CRUD sản phẩm. */
export default function StoreListingDashboard() {
  const { rows, isLoading, error, retry, canManage, publish, unlist } = useStoreCharacters();
  const [catalogProducts, setCatalogProducts] = useState<StoreCatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("characters");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bundleRefreshTrigger, setBundleRefreshTrigger] = useState(0);
  const [bundleCount, setBundleCount] = useState<number | null>(null);
  const [subscriptionRefreshTrigger, setSubscriptionRefreshTrigger] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState<number | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    characters: null,
    "approval-queue": null,
    "led-models": null,
    bundles: null,
    subscriptions: null,
  });

  useEffect(() => {
    fetchManagedBundles({ size: 1 })
      .then((res) => setBundleCount(res.totalElements))
      .catch(() => { });
  }, [bundleRefreshTrigger]);

  useEffect(() => {
    fetchManagedSubscriptions()
      .then((list) => setSubscriptionCount(list.length))
      .catch(() => { });
  }, [subscriptionRefreshTrigger]);

  const refreshCatalog = () => {
    fetchStoreProducts({ size: 100 })
      .then((res) => {
        const publishedItems: StoreCatalogItem[] = res.items.map((item) => ({
          ...item,
          status: "PUBLISHED",
        }));
        const publishedIdSet = new Set(publishedItems.map((item) => String(item.id)));

        const createdLedItems: StoreCatalogItem[] = [];
        for (const created of getCreatedStoreProducts()) {
          if (created.productType !== "LED" || created.productId == null) {
            continue;
          }
          const idStr = String(created.productId);
          if (publishedIdSet.has(idStr)) {
            if (created.status !== "PUBLISHED") {
              updateCreatedStoreProductStatus(idStr, "PUBLISHED");
            }
            continue;
          }
          if (created.status === "DELETED") {
            continue;
          }
          createdLedItems.push({
            id: idStr,
            productId: created.productId,
            productType: "LED_MODEL",
            name: created.productName ?? `Sản phẩm LED #${idStr}`,
            price: Number(created.basePrice ?? 0),
            description: created.description ?? "",
            previewUrl: created.thumbnailUrl || undefined,
            galleryUrls: created.galleryUrls ?? [],
            status: (created.status as StoreCatalogItem["status"]) ?? "UNPUBLISHED",
          });
        }

        setCatalogProducts([...createdLedItems, ...publishedItems]);
      })
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
      id: "approval-queue",
      label: "Chờ duyệt (UNPUBLISHED)",
      count: isLoading ? null : counts.pending,
    },
    {
      id: "led-models",
      label: "LED Models",
      count: catalogProducts.filter((product) => product.productType === "LED_MODEL").length,
    },
    {
      id: "bundles",
      label: "Gói Combo (Bundles)",
      count: bundleCount,
    },
    {
      id: "subscriptions",
      label: "Gói Hội viên (Subscriptions)",
      count: subscriptionCount,
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModal({ kind: "create-character" })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] px-4 py-2.5 text-sm font-black text-[#10351f] shadow-[2px_2px_0_#c6e8cd] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd]"
            >
              <Sparkles size={16} />
              Mở bán Character
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "create" })}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Cpu size={16} />
              Tạo sản phẩm LED
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "create-bundle" })}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Package size={16} className="text-[#2d6a4f]" />
              Tạo gói Combo
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "create-subscription" })}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-[#1f432b] shadow-sm transition hover:bg-[#f4fbf6]"
            >
              <Crown size={16} className="text-[#2d6a4f]" />
              Tạo gói hội viên
            </button>
          </div>
        )}
      </header>

      {!canManage && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
        >
          <Lock size={15} className="shrink-0" />
          Chế độ chỉ xem: Chỉ tài khoản Manager hoặc Admin mới có quyền tạo mới, duyệt publish, đổi version, chỉnh sửa, lưu trữ hoặc xóa mềm các sản phẩm.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Clock3 size={19} />}
          label="Chờ duyệt"
          value={isLoading ? null : counts.pending}
          helper="Click để xem & duyệt UNPUBLISHED"
          tone="amber"
          onClick={() => setActiveTab("approval-queue")}
        />
        <SummaryCard
          icon={<CheckCircle2 size={19} />}
          label="Đã publish"
          value={isLoading ? null : counts.published}
          helper="Đang mở bán trên Store"
          tone="green"
          onClick={() => setActiveTab("characters")}
        />
        <SummaryCard
          icon={<EyeOff size={19} />}
          label="Đã ẩn"
          value={isLoading ? null : counts.hidden}
          helper="Tạm ngừng hiển thị trên Store"
          tone="gray"
          onClick={() => setActiveTab("characters")}
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
          className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[#e3efe6] px-4 pt-3"
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
                className={`-mb-px flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${selected
                    ? "border-primary-dark text-primary-dark"
                    : "border-transparent text-text-muted hover:text-[#173b28]"
                  }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${selected ? "bg-primary/30 text-[#165d3a]" : "bg-gray-100 text-gray-600"
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
              onCreateCharacter={() => setModal({ kind: "create-character" })}
            />
          )}
          {activeTab === "approval-queue" && (
            <ManagerProductListingTable
              rows={rows}
              isLoading={isLoading}
              canManage={canManage}
              onEdit={(character) =>
                setModal({
                  kind: "edit",
                  product: {
                    id: character.characterId,
                    productName: character.name,
                    basePrice: character.draft?.basePrice ?? 199000,
                    description: character.description,
                    thumbnailUrl: character.draft?.thumbnailUrl ?? character.thumbnailUrl,
                    galleryUrls: character.draft?.galleryUrls ?? [],
                  },
                })
              }
              onApprove={async (character, price) => {
                const numericId = Number(character.characterId);
                if (Number.isSafeInteger(numericId) && numericId > 0) {
                  if (character.draft && price !== undefined) {
                    const safeThumb =
                      character.draft.thumbnailUrl && /^https?:\/\//i.test(character.draft.thumbnailUrl)
                        ? character.draft.thumbnailUrl
                        : undefined;
                    const safeGallery = (character.draft.galleryUrls || []).filter((u) => /^https?:\/\//i.test(u));
                    await apiUpdateStoreProduct(numericId, {
                      productName: character.name,
                      basePrice: price,
                      description: character.description || undefined,
                      thumbnailUrl: safeThumb,
                      galleryUrls: safeGallery,
                    });
                  }
                  await apiUpdateProductStatus(numericId, "PUBLISHED");
                }
                updateCreatedStoreProductStatus(character.characterId, "PUBLISHED");
                setNotice(`Đã duyệt sản phẩm "${character.name}" và công khai mở bán trên Store!`);
                refreshCatalog();
              }}
              onRefresh={refreshCatalog}
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
              onPublish={async (product) => {
                try {
                  await apiUpdateProductStatus(Number(product.id), "PUBLISHED");
                  updateCreatedStoreProductStatus(product.id, "PUBLISHED");
                  setNotice(`Đã mở bán sản phẩm "${product.name}" lên Store.`);
                  refreshCatalog();
                } catch {
                  setNotice(`Mở bán sản phẩm thất bại.`);
                }
              }}
              onUnlist={async (product) => {
                try {
                  await apiUpdateProductStatus(Number(product.id), "UNPUBLISHED");
                  updateCreatedStoreProductStatus(product.id, "UNPUBLISHED");
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
            <BundleListingTable
              canManage={canManage}
              refreshTrigger={bundleRefreshTrigger}
              onCreate={() => setModal({ kind: "create-bundle" })}
              onEdit={(bundle) => setModal({ kind: "edit-bundle", bundle })}
              onDelete={(bundle) => setModal({ kind: "delete-bundle", bundle })}
              onPublish={async (bundle) => {
                try {
                  await apiUpdateProductStatus(bundle.productId, "PUBLISHED");
                  setNotice(`Đã mở bán gói combo "${bundle.bundleName}" lên Store.`);
                  setBundleRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Mở bán gói combo thất bại.`);
                }
              }}
              onUnlist={async (bundle) => {
                try {
                  await apiUpdateProductStatus(bundle.productId, "UNPUBLISHED");
                  setNotice(`Đã ẩn gói combo "${bundle.bundleName}" khỏi Store.`);
                  setBundleRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Ẩn gói combo thất bại.`);
                }
              }}
            />
          )}
          {activeTab === "subscriptions" && (
            <SubscriptionListingTable
              canManage={canManage}
              refreshTrigger={subscriptionRefreshTrigger}
              onCountChange={setSubscriptionCount}
              onCreate={() => setModal({ kind: "create-subscription" })}
              onEdit={(plan) => setModal({ kind: "edit-subscription", plan })}
              onPublish={async (plan) => {
                try {
                  await apiUpdateProductStatus(plan.productId, "PUBLISHED");
                  setNotice(`Đã mở bán gói hội viên "${plan.planName}" lên Store.`);
                  setSubscriptionRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Mở bán gói hội viên thất bại.`);
                }
              }}
              onUnlist={async (plan) => {
                try {
                  await apiUpdateProductStatus(plan.productId, "UNPUBLISHED");
                  setNotice(`Đã ẩn gói hội viên "${plan.planName}" khỏi Store.`);
                  setSubscriptionRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Ẩn gói hội viên thất bại.`);
                }
              }}
            />
          )}
        </div>
      </section>

      {modal?.kind === "create-character" && (
        <CreateCharacterProductModal
          onClose={() => setModal(null)}
          onSuccess={(created) => {
            setActiveTab("characters");
            setNotice(
              `Tạo sản phẩm Character "${created.productName}" (ID #${created.productId}) thành công${
                created.status === "PUBLISHED" ? " và đã Publish lên Store" : " ở trạng thái Chờ duyệt"
              }.`
            );
            refreshCatalog();
          }}
        />
      )}

      {modal?.kind === "create" && (
        <CreateStoreProductModal
          onClose={() => setModal(null)}
          onSuccess={(created) => {
            setActiveTab("led-models");
            setNotice(
              `Tạo sản phẩm "${created.productName}" (ID #${created.productId}) thành công ở trạng thái ${created.status ?? "UNPUBLISHED"}.`
            );
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
            updateCreatedStoreProductStatus(modal.productId, "ARCHIVED");
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
            updateCreatedStoreProductStatus(modal.productId, "DELETED");
            setNotice(`Đã xóa mềm sản phẩm "${productName}" thành công.`);
            refreshCatalog();
          }}
        />
      )}

      {modal?.kind === "create-bundle" && (
        <CreateBundleModal
          onClose={() => setModal(null)}
          onSuccess={(created) => {
            setModal(null);
            setBundleRefreshTrigger((prev) => prev + 1);
            setActiveTab("bundles");
            setNotice(
              `Tạo gói combo "${created.bundleName}" (#${created.bundleId}) thành công ở trạng thái CHỜ MỞ BÁN.`,
            );
          }}
        />
      )}

      {modal?.kind === "edit-bundle" && (
        <EditBundleModal
          bundle={modal.bundle}
          onClose={() => setModal(null)}
          onSuccess={(updated) => {
            setModal(null);
            setBundleRefreshTrigger((prev) => prev + 1);
            setNotice(`Cập nhật gói combo "${updated.bundleName}" thành công.`);
          }}
        />
      )}

      {modal?.kind === "delete-bundle" && (
        <DeleteBundleConfirmModal
          bundle={modal.bundle}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            setBundleRefreshTrigger((prev) => prev + 1);
            setNotice(`Đã xóa/lưu trữ gói combo thành công.`);
          }}
        />
      )}

      {modal?.kind === "create-subscription" && (
        <CreateSubscriptionModal
          onClose={() => setModal(null)}
          onSuccess={(created) => {
            setModal(null);
            setSubscriptionRefreshTrigger((prev) => prev + 1);
            setActiveTab("subscriptions");
            setNotice(
              `Tạo gói hội viên "${created.planName}" (${created.planCode}) thành công ở trạng thái ${created.status}.`,
            );
          }}
        />
      )}

      {modal?.kind === "edit-subscription" && (
        <EditSubscriptionModal
          plan={modal.plan}
          onClose={() => setModal(null)}
          onSuccess={(updated) => {
            setModal(null);
            setSubscriptionRefreshTrigger((prev) => prev + 1);
            setNotice(`Cập nhật gói hội viên "${updated.planName}" thành công.`);
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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  helper: string;
  tone: keyof typeof TONE;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`neo-box-no-hover bg-white p-4 transition-all ${
        onClick
          ? "cursor-pointer hover:border-[#198653] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#198653]"
          : ""
      }`}
    >
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
