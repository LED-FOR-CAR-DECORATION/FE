"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CheckCircle2, Lock, Plus, Store, X } from "lucide-react";
import {
  apiUpdateProductStatus,
  apiUpdateStoreProduct,
  fetchManagedStoreProducts,
} from "@/lib/api/products";
import { useStoreCharacters } from "../hooks/useStoreCharacters";
import type { PublishMode, StoreCharacterRow } from "../types";
import CatalogListingTable, { type StoreCatalogItem } from "./CatalogListingTable";
import CharacterListingTable from "./CharacterListingTable";
import SelectProductTypeModal, { type CreatableStoreProductKind } from "./SelectProductTypeModal";
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
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";
import { fetchManagedBundles, type ManagedBundleItem } from "@/lib/api/bundles";
import {
  fetchManagedSubscriptions,
  type ManagedSubscriptionPlan,
} from "@/lib/api/subscriptions";

type TabId = "characters" | "led-models" | "bundles" | "subscriptions";

type ModalState =
  | { kind: "select-product-type" }
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
  const [characterStatusFilter, setCharacterStatusFilter] = useState<StoreStatusFilter>("ALL");
  const [characterQuery, setCharacterQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bundleRefreshTrigger, setBundleRefreshTrigger] = useState(0);
  const [bundleCount, setBundleCount] = useState<number | null>(null);
  const [subscriptionRefreshTrigger, setSubscriptionRefreshTrigger] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState<number | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    characters: null,
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
    fetchManagedStoreProducts({ productType: "LED", size: 200 })
      .then((res) => {
        const ledItems: StoreCatalogItem[] = res.items.map((item) => ({
          id: String(item.productId),
          productId: item.productId,
          productType: "LED_MODEL",
          name: item.productName,
          price: Number(item.basePrice ?? 0),
          description: item.description ?? "",
          previewUrl: item.thumbnailUrl || item.galleryUrls?.[0] || undefined,
          galleryUrls: item.galleryUrls ?? [],
          tags: item.tags ?? [],
          status: item.status,
        }));
        setCatalogProducts(ledItems);
      })
      .catch((err) => console.error("Failed to load managed LED products:", err));
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

  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === "UNPUBLISHED").length,
    [rows],
  );

  const tabs: { id: TabId; label: string; count: number | null; pendingCount?: number }[] = [
    {
      id: "characters",
      label: "Nhân vật",
      count: isLoading ? null : rows.length,
      pendingCount: isLoading ? 0 : pendingCount,
    },
    {
      id: "led-models",
      label: "Mẫu LED",
      count: catalogProducts.length,
    },
    {
      id: "bundles",
      label: "Gói sản phẩm",
      count: bundleCount,
    },
    {
      id: "subscriptions",
      label: "Gói hội viên",
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
        ? `${character.name} đã được chuyển sang phiên bản ${updated.activeVersion?.versionNumber} trên cửa hàng.`
        : `${character.name} đã được mở bán trên cửa hàng với phiên bản ${updated.activeVersion?.versionNumber}.`,
    );
    refreshCatalog();
  };

  const handleUnlist = async () => {
    if (modal?.kind !== "unlist") return;
    const { character } = modal;
    await unlist(character.characterId);
    setModal(null);
    setNotice(`${character.name} đã được ẩn khỏi cửa hàng thành công.`);
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
            Quản lý cửa hàng sản phẩm
          </h1>
          <p className="mt-1 text-sm font-medium text-text-muted">
            Quản lý danh mục sản phẩm, duyệt nhân vật, chỉnh sửa và điều chỉnh trạng thái hiển thị trên cửa hàng.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModal({ kind: "select-product-type" })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] px-4 py-2.5 text-sm font-black text-[#10351f] shadow-[2px_2px_0_#c6e8cd] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd]"
            >
              <Plus size={16} />
              Tạo sản phẩm
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
          Chế độ chỉ xem: Chỉ tài khoản Quản lý hoặc Quản trị viên mới có quyền tạo mới, duyệt mở bán, chỉnh sửa, ngừng bán hoặc xóa mềm các sản phẩm.
        </p>
      )}

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
                {tab.pendingCount !== undefined && tab.pendingCount > 0 && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                    {tab.pendingCount} chờ duyệt
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === "characters" && (
            <div>
              <StoreListingToolbar
                statusFilter={characterStatusFilter}
                onStatusFilterChange={setCharacterStatusFilter}
                counts={computeStatusCounts(rows, (row) => row.status)}
                isLoading={isLoading}
                searchQuery={characterQuery}
                onSearchChange={setCharacterQuery}
                searchPlaceholder="Tìm kiếm nhân vật theo tên hoặc mã…"
                onRefresh={refreshCatalog}
                onReset={() => {
                  setCharacterStatusFilter("ALL");
                  setCharacterQuery("");
                }}
                canReset={characterStatusFilter !== "ALL" || characterQuery !== ""}
              />

              {characterStatusFilter === "UNPUBLISHED" ? (
                <ManagerProductListingTable
                  rows={rows}
                  isLoading={isLoading}
                  canManage={canManage}
                  externalQuery={characterQuery}
                  hideHeader
                  onEdit={(character) =>
                    setModal({
                      kind: "edit",
                      product: {
                        id: character.characterId,
                        productType: "CHARACTER",
                        productName: character.name,
                        basePrice: character.draft?.basePrice ?? character.basePrice ?? 0,
                        description: character.description,
                        thumbnailUrl: character.draft?.thumbnailUrl ?? character.thumbnailUrl,
                        galleryUrls: character.draft?.galleryUrls ?? character.galleryUrls ?? [],
                        tags: character.tags ?? [],
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
                    setNotice(`Đã duyệt nhân vật "${character.name}" sang trạng thái Đang bán!`);
                    refreshCatalog();
                  }}
                  onRefresh={refreshCatalog}
                />
              ) : (
                <CharacterListingTable
                  rows={rows}
                  isLoading={isLoading}
                  error={error}
                  onRetry={retry}
                  canManage={canManage}
                  statusFilter={characterStatusFilter}
                  searchQuery={characterQuery}
                  hideControls
                  onPublish={(character, mode) => setModal({ kind: "publish", character, mode })}
                  onUnlist={(character) => setModal({ kind: "unlist", character })}
                  onEdit={(character) =>
                    setModal({
                      kind: "edit",
                      product: {
                        id: character.characterId,
                        productType: "CHARACTER",
                        productName: character.name,
                        basePrice: character.basePrice ?? character.draft?.basePrice ?? 0,
                        description: character.description,
                        thumbnailUrl: character.thumbnailUrl,
                        galleryUrls: character.galleryUrls ?? [],
                        tags: character.tags ?? [],
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
            </div>
          )}
          {activeTab === "led-models" && (
            <CatalogListingTable
              kind="LED_MODEL"
              items={catalogProducts}
              canManage={canManage}
              onRefresh={refreshCatalog}
              onEdit={(product) =>
                setModal({
                  kind: "edit",
                  product: {
                    id: product.id,
                    productType: "LED",
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
                  setNotice(`Đã chuyển sản phẩm "${product.name}" sang Đang bán.`);
                  refreshCatalog();
                } catch {
                  setNotice(`Mở bán sản phẩm thất bại.`);
                }
              }}
              onUnlist={async (product) => {
                try {
                  await apiUpdateProductStatus(Number(product.id), "UNPUBLISHED");
                  setNotice(`Đã chuyển sản phẩm "${product.name}" sang Chờ duyệt.`);
                  refreshCatalog();
                } catch {
                  setNotice(`Cập nhật trạng thái thất bại.`);
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
                  setNotice(`Đã chuyển gói sản phẩm "${bundle.bundleName}" sang Đang bán.`);
                  setBundleRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Mở bán gói sản phẩm thất bại.`);
                }
              }}
              onUnlist={async (bundle) => {
                try {
                  await apiUpdateProductStatus(bundle.productId, "UNPUBLISHED");
                  setNotice(`Đã chuyển gói sản phẩm "${bundle.bundleName}" sang Chờ duyệt.`);
                  setBundleRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Cập nhật trạng thái gói sản phẩm thất bại.`);
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
                  setNotice(`Đã chuyển gói hội viên "${plan.planName}" sang Đang bán.`);
                  setSubscriptionRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Mở bán gói hội viên thất bại.`);
                }
              }}
              onUnlist={async (plan) => {
                try {
                  await apiUpdateProductStatus(plan.productId, "UNPUBLISHED");
                  setNotice(`Đã chuyển gói hội viên "${plan.planName}" sang Chờ duyệt.`);
                  setSubscriptionRefreshTrigger((prev) => prev + 1);
                } catch {
                  setNotice(`Cập nhật trạng thái gói hội viên thất bại.`);
                }
              }}
              onArchive={(plan) =>
                setModal({
                  kind: "archive",
                  productId: plan.productId,
                  productName: plan.planName,
                })
              }
              onDelete={(plan) =>
                setModal({
                  kind: "delete",
                  productId: plan.productId,
                  productName: plan.planName,
                })
              }
            />
          )}
        </div>
      </section>

      {modal?.kind === "select-product-type" && (
        <SelectProductTypeModal
          onClose={() => setModal(null)}
          onSelectType={(selectedType: CreatableStoreProductKind) => {
            if (selectedType === "BUNDLE") {
              setModal({ kind: "create-bundle" });
            } else {
              setModal({ kind: "create-subscription" });
            }
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
            setNotice(`Đã chuyển sản phẩm "${productName}" sang trạng thái Ngừng bán.`);
            refreshCatalog();
            setSubscriptionRefreshTrigger((prev) => prev + 1);
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
            setSubscriptionRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {modal?.kind === "create-bundle" && (
        <CreateBundleModal
          onClose={() => setModal(null)}
          onBackToTypeSelect={() => setModal({ kind: "select-product-type" })}
          onSuccess={(created) => {
            setModal(null);
            setBundleRefreshTrigger((prev) => prev + 1);
            setActiveTab("bundles");
            setNotice(
              `Tạo gói sản phẩm "${created.bundleName}" (#${created.bundleId}) thành công ở trạng thái ${
                created.status === "PUBLISHED" ? "Đang mở bán" : "Chưa mở bán"
              }.`,
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
            setNotice(`Cập nhật gói sản phẩm "${updated.bundleName}" thành công.`);
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
            setNotice(`Đã xóa hoặc lưu trữ gói sản phẩm thành công.`);
          }}
        />
      )}

      {modal?.kind === "create-subscription" && (
        <CreateSubscriptionModal
          onClose={() => setModal(null)}
          onBackToTypeSelect={() => setModal({ kind: "select-product-type" })}
          onSuccess={(created) => {
            setModal(null);
            setSubscriptionRefreshTrigger((prev) => prev + 1);
            setActiveTab("subscriptions");
            setNotice(
              `Tạo gói hội viên "${created.planName}" (${created.planCode}) thành công ở trạng thái ${
                created.status === "PUBLISHED" ? "Đang mở bán" : "Chưa mở bán"
              }.`,
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
