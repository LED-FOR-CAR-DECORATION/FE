"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle, ChevronLeft, ChevronRight, FileSpreadsheet, List, MoreVertical, PackageCheck, RotateCcw, Search, Upload } from "lucide-react";
import { getAvailableStock, getInventoryStatus, INVENTORY_IMPORTS, LED_INVENTORY, type InventoryStatus } from "@/features/product/inventory";
import { useOrders } from "@/features/order/context/OrderContext";

const STATUS_LABEL: Record<InventoryStatus, string> = {
  "In stock": "Còn hàng",
  "Low stock": "Sắp hết hàng",
  "Out of stock": "Hết hàng",
};
const STATUS_CLASS: Record<InventoryStatus, string> = {
  "In stock": "border-green-200 bg-green-50 text-green-700",
  "Low stock": "border-amber-200 bg-amber-50 text-amber-700",
  "Out of stock": "border-red-200 bg-red-50 text-red-700",
};

type SortOption = "name" | "stock" | "available";
const PAGE_SIZE = 10;

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"models" | "instances">("models");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InventoryStatus | "All">("All");
  const [sort, setSort] = useState<SortOption>("name");
  const [page, setPage] = useState(1);
  const [fileName, setFileName] = useState("");
  const { orders } = useOrders();

  const filteredItems = useMemo(() => LED_INVENTORY
    .filter((item) => {
      const normalized = query.trim().toLowerCase();
      const matchesQuery = !normalized || [item.name, item.modelCode, item.description].some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery && (status === "All" || getInventoryStatus(item) === status);
    })
    .sort((first, second) => sort === "name"
      ? first.name.localeCompare(second.name)
      : sort === "stock"
        ? second.stock - first.stock
        : getAvailableStock(second) - getAvailableStock(first)), [query, sort, status]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, sort, status]);

  const totalStock = LED_INVENTORY.reduce((sum, item) => sum + item.stock, 0);
  const lowStockCount = LED_INVENTORY.filter((item) => getInventoryStatus(item) === "Low stock").length;
  const soldThisMonth = orders
    .filter((order) => order.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, order) => sum + order.items.filter((item) => item.productType === "LED_MODEL").reduce((count, item) => count + item.quantity, 0), 0);

  const resetFilters = () => {
    setQuery("");
    setStatus("All");
    setSort("name");
    setPage(1);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Quản lý kho LED</h1>
          <p className="mt-1 text-sm font-medium text-text-muted">Theo dõi tồn kho, quản lý thiết bị và nhập hàng cho các model LED</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={<Boxes size={19} />} label="Tổng số lượng tồn kho" value={totalStock} helper="Số lượng sản phẩm hiện có" />
        <SummaryCard icon={<List size={19} />} label="Số model LED" value={LED_INVENTORY.length} helper="Đang kinh doanh" />
        <SummaryCard icon={<AlertTriangle size={19} />} label="Model sắp hết hàng" value={lowStockCount} helper="Cần kiểm tra" tone="warning" />
        <SummaryCard icon={<PackageCheck size={19} />} label="LED đã bán (tháng này)" value={soldThisMonth} helper="Theo đơn hàng đã ghi nhận" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
        <section className="neo-box-no-hover overflow-hidden bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b-2 border-primary-light px-4 pt-3">
            <button type="button" onClick={() => setActiveTab("models")} className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "models" ? "border-primary-dark text-primary-dark" : "border-transparent text-text-muted"}`}><List size={15} className="mr-1 inline" /> Danh sách theo model</button>
            <button type="button" onClick={() => setActiveTab("instances")} className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "instances" ? "border-primary-dark text-primary-dark" : "border-transparent text-text-muted"}`}><Boxes size={15} className="mr-1 inline" /> Danh sách thiết bị (instance)</button>
          </div>
          {activeTab === "instances" ? <EmptyInstances /> : <><div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_180px_180px_auto]"><label className="flex items-center gap-2 border-2 border-gray-200 px-3 py-2 text-sm"><Search size={15} className="text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full outline-none" placeholder="Tìm model, mã model..." /></label><select value={status} onChange={(event) => setStatus(event.target.value as InventoryStatus | "All")} className="border-2 border-gray-200 px-3 py-2 text-sm"><option value="All">Trạng thái: Tất cả</option><option value="In stock">Còn hàng</option><option value="Low stock">Sắp hết hàng</option><option value="Out of stock">Hết hàng</option></select><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="border-2 border-gray-200 px-3 py-2 text-sm"><option value="name">Sắp xếp: Tên model (A - Z)</option><option value="stock">Tồn kho cao nhất</option><option value="available">Khả dụng cao nhất</option></select><button type="button" onClick={resetFilters} className="inline-flex items-center justify-center gap-1 border-2 border-black px-3 py-2 text-xs font-bold hover:bg-primary/20"><RotateCcw size={14} /> Đặt lại</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b border-gray-200 bg-gray-50"><tr>{["", "Model", "Mã model", "Tồn kho", "Đã đặt", "Khả dụng", "Ngưỡng tối thiểu", "Trạng thái", "Chi tiết"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase">{heading}</th>)}</tr></thead><tbody>{paginatedItems.map((item) => { const itemStatus = getInventoryStatus(item); return <tr key={item.productId} className="border-b border-gray-100 hover:bg-green-50/50"><td className="px-4 py-3"><input type="checkbox" aria-label={`Chọn ${item.name}`} /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center overflow-hidden border border-gray-200 bg-gray-50">{item.previewUrl ? <Image src={item.previewUrl} alt="" width={40} height={40} className="h-full w-full object-contain" /> : <Boxes size={17} className="text-text-muted" />}</div><div><p className="font-bold">{item.name}</p><p className="text-[11px] text-text-muted">{item.description}</p></div></div></td><td className="px-4 py-3 text-xs font-bold text-text-muted">{item.modelCode}</td><td className="px-4 py-3 font-black">{item.stock}</td><td className="px-4 py-3">{item.reserved}</td><td className="px-4 py-3 font-black text-primary-dark">{getAvailableStock(item)}</td><td className="px-4 py-3">{item.minimumStock}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${STATUS_CLASS[itemStatus]}`}>{STATUS_LABEL[itemStatus]}</span></td><td className="px-4 py-3"><button type="button" aria-label={`Thao tác ${item.name}`} className="border border-gray-300 p-1.5 hover:bg-primary/20"><MoreVertical size={15} /></button></td></tr>; })}{filteredItems.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center font-semibold text-text-muted">Không tìm thấy model LED phù hợp.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><p className="text-xs text-text-muted">Hiển thị {filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredItems.length)} / {filteredItems.length} model</p><div className="flex items-center gap-1"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`min-w-8 border px-2 py-1 text-xs font-bold ${currentPage === pageNumber ? "border-primary-dark bg-primary/20 text-primary-dark" : "border-gray-300 hover:bg-primary/10"}`} aria-label={`Trang ${pageNumber}`}>{pageNumber}</button>)}<button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} className="border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={16} /></button></div></div></>}</section>

        <aside className="flex flex-col gap-5">
          <ImportCard fileName={fileName} onFileChange={setFileName} />
          <section className="neo-box-no-hover bg-white p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><FileSpreadsheet size={17} className="text-primary-dark" /><h2 className="font-black">Lịch sử nhập kho</h2></div><button type="button" className="text-xs font-bold text-primary-dark hover:underline">Xem tất cả →</button></div><div className="flex flex-col gap-3">{INVENTORY_IMPORTS.map((record) => <div key={record.id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"><FileSpreadsheet size={17} className="shrink-0 text-primary-dark" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{record.fileName}</p><p className="text-[10px] text-text-muted">{record.itemCount} thiết bị · {new Date(record.importedAt).toLocaleString("vi-VN")}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${record.status === "Completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{record.status === "Completed" ? "Thành công" : "Lỗi"}</span></div>)}</div></section>
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, helper, tone = "default" }: { icon: React.ReactNode; label: string; value: number; helper: string; tone?: "default" | "warning" }) {
  return <div className="neo-box-no-hover bg-white p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center border-2 border-black ${tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-primary/20"}`}>{icon}</div><p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className={`mt-1 text-[10px] font-bold ${tone === "warning" ? "text-amber-700" : "text-text-muted"}`}>{helper}</p></div>;
}

function ImportCard({ fileName, onFileChange }: { fileName: string; onFileChange: (value: string) => void }) {
  return <section className="neo-box-no-hover bg-white p-5"><div className="mb-4 flex items-center gap-2"><Upload size={17} className="text-primary-dark" /><h2 className="font-black">Nhập kho từ file Excel</h2></div><div className="flex flex-col gap-4 text-xs"><div className="flex gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary font-black">1</span><div><p className="font-bold">Tải file Excel</p><p className="text-text-muted">Chọn file chứa danh sách thiết bị để nhập kho</p></div></div><label className="flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-primary-dark"><Upload size={22} className="text-primary-dark" /><span className="font-bold">{fileName || "Kéo thả file Excel vào đây"}</span><span className="text-text-muted">.xlsx hoặc .xls (tối đa 10MB)</span><input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(event) => onFileChange(event.target.files?.[0]?.name ?? "")} /></label><button type="button" className="inline-flex items-center justify-center gap-2 border-2 border-black bg-primary px-3 py-2 text-xs font-bold hover:bg-primary/80"><FileSpreadsheet size={14} /> Tải mẫu file Excel</button><div className="flex gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-gray-100 font-black">2</span><p className="font-bold">Kiểm tra dữ liệu</p></div><div className="flex gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-gray-100 font-black">3</span><p className="font-bold">Xác nhận nhập kho</p></div></div></section>;
}

function EmptyInstances() {
  return <div className="grid min-h-[420px] place-items-center p-10 text-center"><Boxes size={42} className="mb-3 text-primary-dark" /><h2 className="text-lg font-black">Chưa có dữ liệu instance</h2><p className="mt-2 max-w-md text-sm text-text-muted">Danh sách thiết bị vật lý sẽ xuất hiện sau khi backend hoặc file nhập kho cung cấp mã serial.</p></div>;
}
