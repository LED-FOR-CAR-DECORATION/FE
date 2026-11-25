"use client";

import { Boxes, ChevronRight, Crown, Info } from "lucide-react";
import StoreModal from "./StoreModal";

export type CreatableStoreProductKind = "BUNDLE" | "SUBSCRIPTION";

interface SelectProductTypeModalProps {
  onClose: () => void;
  onSelectType: (type: CreatableStoreProductKind) => void;
}

const PRODUCT_TYPE_OPTIONS: Array<{
  type: CreatableStoreProductKind;
  title: string;
  subtitle: string;
  sourceHint: string;
  icon: typeof Boxes;
  iconBgClass: string;
}> = [
  {
    type: "BUNDLE",
    title: "Gói sản phẩm",
    subtitle: "Kết hợp các mẫu LED và nhân vật có sẵn thành gói ưu đãi trên Cửa hàng.",
    sourceHint: "Tạo đồng thời Gói sản phẩm & Sản phẩm bày bán",
    icon: Boxes,
    iconBgClass: "bg-[#fef08a] text-black",
  },
  {
    type: "SUBSCRIPTION",
    title: "Gói hội viên",
    subtitle: "Thiết lập quyền lợi, chu kỳ, giá bán và hình ảnh gói hội viên trên Cửa hàng.",
    sourceHint: "Tạo đồng thời Gói hội viên & Sản phẩm bày bán",
    icon: Crown,
    iconBgClass: "bg-[#e9d5ff] text-black",
  },
];

export default function SelectProductTypeModal({
  onClose,
  onSelectType,
}: SelectProductTypeModalProps) {
  return (
    <StoreModal
      title="Tạo sản phẩm mới"
      badge="TẠO SẢN PHẨM"
      description="Chọn loại sản phẩm cần tạo. Hệ thống sẽ tạo đồng thời thực thể tương ứng và sản phẩm bày bán trên Cửa hàng."
      onClose={onClose}
      size="lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
        >
          Đóng
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PRODUCT_TYPE_OPTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectType(item.type)}
                className="group flex cursor-pointer flex-col justify-between gap-3 border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary/15 hover:shadow-[6px_6px_0_0_#000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black shadow-[2px_2px_0_0_#000] ${item.iconBgClass}`}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-black"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-black">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-text-muted">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-gray-200 pt-2.5 text-[11px] font-bold text-primary-ink">
                  {item.sourceHint}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 border-2 border-black bg-primary/15 p-3.5 text-xs font-medium text-black">
          <Info size={16} className="mt-0.5 shrink-0 text-primary-ink" aria-hidden="true" />
          <div className="space-y-1">
            <p>
              <strong className="font-black">Mẫu LED:</strong> Được tạo đồng thời cùng sản phẩm bày bán ngay tại trang{" "}
              <strong className="font-black">Quản lý kho LED</strong>.
            </p>
            <p>
              <strong className="font-black">Nhân vật:</strong> Được tạo khi <strong className="font-black">Nhà thiết kế</strong> gửi từ xưởng thiết kế lên mục{" "}
              <strong className="font-black">Chờ duyệt</strong> để Quản lý kiểm tra và mở bán.
            </p>
          </div>
        </div>
      </div>
    </StoreModal>
  );
}
