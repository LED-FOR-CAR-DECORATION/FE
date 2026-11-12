import Image from "next/image";
import { Info } from "lucide-react";
import { PRODUCTS } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { formatVnd } from "../format";

type CatalogKind = Extract<ProductType, "LED_MODEL" | "BUNDLE">;

const COPY: Record<CatalogKind, { label: string; notice: string }> = {
  LED_MODEL: {
    label: "Model LED",
    notice:
      "Chế độ xem thông tin. Entity LED_MODEL trong ERD hiện tại chưa có trường trạng thái listing; tính năng quản lý duyệt/ẩn hiển thị sẽ được tích hợp khi có API backend tương ứng.",
  },
  BUNDLE: {
    label: "Bundle",
    notice:
      "Chế độ xem thông tin. Bundle hiện chưa được mô hình hóa độc lập trong ERD; tính năng quản lý duyệt/ẩn hiển thị sẽ được tích hợp khi có đặc tả backend hoàn chỉnh.",
  },
};

/** Bảng xem thông tin các sản phẩm bán trên Store chưa có luồng duyệt phiên bản riêng. */
export default function CatalogListingTable({ kind }: { kind: CatalogKind }) {
  const items = PRODUCTS.filter((product) => product.productType === kind);
  const isBundle = kind === "BUNDLE";
  const headings = [
    "Mã sản phẩm",
    "Thumbnail",
    "Tên sản phẩm",
    isBundle ? "Thành phần Bundle" : "Mô tả",
    "Giá bán",
    "Trạng thái Store",
  ];

  return (
    <>
      <p className="m-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        {COPY[kind].notice}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Danh sách {COPY[kind].label} đang bán trên Store</caption>
          <thead className="border-b border-[#e3efe6]">
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[#eef5f0] last:border-0 hover:bg-[#f9fdfa]">
                <td className="whitespace-nowrap px-4 py-3 text-xs font-black text-primary-dark">{item.id}</td>
                <td className="px-4 py-3">
                  {item.previewUrl && (
                    <Image
                      src={item.previewUrl}
                      alt={`Thumbnail của ${item.name}`}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] object-contain"
                    />
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{item.name}</td>
                <td className="max-w-xs px-4 py-3 text-xs font-medium text-text-muted">
                  {isBundle
                    ? `${item.components?.length ?? 0} sản phẩm: ${(item.components ?? [])
                        .map((component) => component.name)
                        .join(", ")}`
                    : item.description}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-black">{formatVnd(item.price)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-800">
                    Hiển thị
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
