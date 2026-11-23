"use client";

import { Boxes, ChevronRight, Crown, Info } from "lucide-react";
import Modal from "@/components/ui/Modal";

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
  accentClass: string;
  iconBgClass: string;
}> = [
  {
    type: "BUNDLE",
    title: "Gói sản phẩm",
    subtitle: "Kết hợp các mẫu LED và nhân vật có sẵn thành gói ưu đãi trên Cửa hàng.",
    sourceHint: "Tạo đồng thời Gói sản phẩm & Sản phẩm bày bán",
    icon: Boxes,
    accentClass: "hover:border-[#b97714] hover:bg-[#fffbf2]",
    iconBgClass: "bg-[#fef4e3] text-[#7c4e08] border-[#f2d08f]",
  },
  {
    type: "SUBSCRIPTION",
    title: "Gói hội viên",
    subtitle: "Thiết lập quyền lợi, chu kỳ, giá bán và hình ảnh gói hội viên trên Cửa hàng.",
    sourceHint: "Tạo đồng thời Gói hội viên & Sản phẩm bày bán",
    icon: Crown,
    accentClass: "hover:border-[#6d45a1] hover:bg-[#faf7fe]",
    iconBgClass: "bg-[#f3ecfc] text-[#4b2d77] border-[#d3bdf5]",
  },
];

export default function SelectProductTypeModal({
  onClose,
  onSelectType,
}: SelectProductTypeModalProps) {
  return (
    <Modal
      title="Tạo sản phẩm mới"
      description="Chọn loại sản phẩm cần tạo. Hệ thống sẽ tạo đồng thời thực thể tương ứng và sản phẩm bày bán trên Cửa hàng."
      onClose={onClose}
      size="lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold text-[#1f432b] transition hover:bg-[#eef8f0]"
        >
          Đóng
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PRODUCT_TYPE_OPTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectType(item.type)}
                className={`group flex flex-col justify-between gap-3 rounded-xl border-2 border-[#ddebe1] bg-white p-4 text-left transition ${item.accentClass}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.iconBgClass}`}
                    >
                      <Icon size={20} />
                    </span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[#1f432b]"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#10351f]">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[#eef5f0] pt-2 text-[11px] font-semibold text-[#3f7553]">
                  {item.sourceHint}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-[#d6e8dc] bg-[#f6fbf7] p-3 text-xs text-[#285237]">
          <Info size={16} className="mt-0.5 shrink-0 text-[#2d6a4f]" />
          <div className="space-y-1">
            <p>
              <strong>Mẫu LED:</strong> Được tạo đồng thời cùng sản phẩm bày bán ngay tại trang{" "}
              <strong>Quản lý kho LED</strong>.
            </p>
            <p>
              <strong>Nhân vật:</strong> Được tạo khi <strong>Nhà thiết kế</strong> gửi từ xưởng thiết kế lên mục{" "}
              <strong>Chờ duyệt</strong> để Quản lý kiểm tra và mở bán.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
