"use client";

import { useState, type FormEvent } from "react";
import { useLedModels } from "../hooks/useLedModels";
import type { LedModelFilters, LedModelStatus } from "../types";

const initialFilters: LedModelFilters = { page: 0, size: 10 };
const statuses: Record<LedModelStatus, string> = {
  ACTIVE: "Đang hoạt động",
  OUT_OF_STOCK: "Hết hàng",
  DEPRECATED: "Ngừng sử dụng",
};
const fieldClass = "rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const buttonClass = fieldClass + " font-bold disabled:opacity-50";

export default function LedModelCatalog() {
  const [filters, setFilters] = useState(initialFilters);
  const [attempt, setAttempt] = useState(0);
  const result = useLedModels(filters, attempt);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const width = values.get("widthPx");
    const height = values.get("heightPx");
    setFilters({
      page: 0,
      size: Number(values.get("size")),
      keyword: String(values.get("keyword")),
      status: (values.get("status") || undefined) as LedModelStatus | undefined,
      widthPx: width ? Number(width) : undefined,
      heightPx: height ? Number(height) : undefined,
      lowStockOnly: values.has("lowStockOnly") || undefined,
      unlinkedToProductOnly: values.has("unlinkedToProductOnly") || undefined,
    });
  }

  const page = result?.page;

  return (
    <div className="space-y-4 p-4">
      <form
        onSubmit={applyFilters}
        onReset={() => setFilters(initialFilters)}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="grid gap-1 text-sm font-medium">
          Tên model
          <input name="keyword" maxLength={255} className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Trạng thái
          <select name="status" className={fieldClass}>
            <option value="">Tất cả</option>
            {Object.entries(statuses).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Rộng (px)
          <input
            name="widthPx"
            type="number"
            min={1}
            max={4096}
            className={fieldClass + " w-24"}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Cao (px)
          <input
            name="heightPx"
            type="number"
            min={1}
            max={4096}
            className={fieldClass + " w-24"}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Số dòng
          <select name="size" className={fieldClass}>
            {[10, 20, 50, 100].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="lowStockOnly" type="checkbox" /> Tồn kho dưới 5
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="unlinkedToProductOnly" type="checkbox" /> Chưa liên kết
          sản phẩm
        </label>
        <button type="submit" className="btn-primary">
          Áp dụng
        </button>
        <button type="reset" className={buttonClass}>
          Đặt lại
        </button>
      </form>

      {!result && <p role="status">Đang tải danh sách model LED…</p>}
      {result?.error && (
        <p role="alert">
          {result.error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Thử lại
          </button>
        </p>
      )}
      {page && (
        <>
          {page.data.length === 0 ? (
            <p>Không có model LED phù hợp.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Model",
                      "Sản phẩm",
                      "Tồn kho",
                      "Trạng thái",
                      "Thông số",
                    ].map((label) => (
                      <th key={label} scope="col" className="p-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((model) => (
                    <tr
                      key={model.modelId}
                      className="border-t border-gray-100 align-top"
                    >
                      <td className="p-3">
                        <strong>{model.modelName}</strong>
                        <br />#{model.modelId}
                      </td>
                      <td className="p-3">
                        {model.productId ?? "Chưa liên kết"}
                      </td>
                      <td className="p-3">
                        {model.stockQuantity}
                        {model.isLowStock && (
                          <p className="font-medium text-amber-800">
                            Tồn kho thấp
                          </p>
                        )}
                      </td>
                      <td className="p-3">{statuses[model.status]}</td>
                      <td className="p-3">
                        {model.spec.widthPx} × {model.spec.heightPx} px
                        {model.spec.attributes.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer">
                              Thuộc tính
                            </summary>
                            <dl>
                              {model.spec.attributes.map(
                                ({ label, value }, index) => (
                                  <div key={index}>
                                    <dt className="inline font-medium">
                                      {label}:{" "}
                                    </dt>
                                    <dd className="inline">{value}</dd>
                                  </div>
                                ),
                              )}
                            </dl>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav
            aria-label="Phân trang model LED"
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            <span>
              {page.meta.totalElements} model · Trang{" "}
              {page.meta.totalPages ? page.meta.page + 1 : 0}/
              {page.meta.totalPages}
            </span>
            <button
              type="button"
              className={buttonClass}
              disabled={!page.meta.hasPrevious}
              onClick={() =>
                setFilters({ ...filters, page: page.meta.page - 1 })
              }
            >
              Trước
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!page.meta.hasNext}
              onClick={() =>
                setFilters({ ...filters, page: page.meta.page + 1 })
              }
            >
              Sau
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
