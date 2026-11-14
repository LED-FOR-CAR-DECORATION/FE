"use client";

import { useState } from "react";
import {
  Boxes,
  CheckCircle,
  FileSpreadsheet,
  List,
  Upload,
} from "lucide-react";
import { INVENTORY_IMPORTS } from "@/features/product/inventory";
import LedModelCatalog from "@/features/led-models/components/LedModelCatalog";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"models" | "instances">("models");
  const [fileName, setFileName] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Quản lý kho LED</h1>
          <p className="mt-1 text-sm font-medium text-text-muted">
            Theo dõi tồn kho, quản lý thiết bị và nhập hàng cho các model LED
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
        <section className="neo-box-no-hover overflow-hidden bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b-2 border-primary-light px-4 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("models")}
              className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "models" ? "border-primary-dark text-primary-dark" : "border-transparent text-text-muted"}`}
            >
              <List size={15} className="mr-1 inline" /> Danh sách theo model
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("instances")}
              className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "instances" ? "border-primary-dark text-primary-dark" : "border-transparent text-text-muted"}`}
            >
              <Boxes size={15} className="mr-1 inline" /> Danh sách thiết bị
              (instance)
            </button>
          </div>
          {activeTab === "instances" ? <EmptyInstances /> : <LedModelCatalog />}
        </section>

        <aside className="flex flex-col gap-5">
          <ImportCard fileName={fileName} onFileChange={setFileName} />
          <section className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={17} className="text-primary-dark" />
                <h2 className="font-black">Lịch sử nhập kho</h2>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-primary-dark hover:underline"
              >
                Xem tất cả →
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {INVENTORY_IMPORTS.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <FileSpreadsheet
                    size={17}
                    className="shrink-0 text-primary-dark"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {record.fileName}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {record.itemCount} thiết bị ·{" "}
                      {new Date(record.importedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${record.status === "Completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {record.status === "Completed" ? "Thành công" : "Lỗi"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ImportCard({
  fileName,
  onFileChange,
}: {
  fileName: string;
  onFileChange: (value: string) => void;
}) {
  return (
    <section className="neo-box-no-hover bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Upload size={17} className="text-primary-dark" />
        <h2 className="font-black">Nhập kho từ file Excel</h2>
      </div>
      <div className="flex flex-col gap-4 text-xs">
        <div className="flex gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary font-black">
            1
          </span>
          <div>
            <p className="font-bold">Tải file Excel</p>
            <p className="text-text-muted">
              Chọn file chứa danh sách thiết bị để nhập kho
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-primary-dark">
          <Upload size={22} className="text-primary-dark" />
          <span className="font-bold">
            {fileName || "Kéo thả file Excel vào đây"}
          </span>
          <span className="text-text-muted">.xlsx hoặc .xls (tối đa 10MB)</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(event) =>
              onFileChange(event.target.files?.[0]?.name ?? "")
            }
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 border-2 border-black bg-primary px-3 py-2 text-xs font-bold hover:bg-primary/80"
        >
          <FileSpreadsheet size={14} /> Tải mẫu file Excel
        </button>
        <div className="flex gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-100 font-black">
            2
          </span>
          <p className="font-bold">Kiểm tra dữ liệu</p>
        </div>
        <div className="flex gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-100 font-black">
            3
          </span>
          <p className="font-bold">Xác nhận nhập kho</p>
        </div>
      </div>
    </section>
  );
}

function EmptyInstances() {
  return (
    <div className="grid min-h-[420px] place-items-center p-10 text-center">
      <Boxes size={42} className="mb-3 text-primary-dark" />
      <h2 className="text-lg font-black">Chưa có dữ liệu instance</h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        Danh sách thiết bị vật lý sẽ xuất hiện sau khi backend hoặc file nhập
        kho cung cấp mã serial.
      </p>
    </div>
  );
}
