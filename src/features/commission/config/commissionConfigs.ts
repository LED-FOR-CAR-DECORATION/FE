export type CommissionFieldRenderType = "select" | "radio";

export interface CommissionOptionConfig {
  id: string;
  value: string;
  label: string;
  /** Phụ phí cộng thêm (VNĐ). Nếu là null nghĩa là cần nhân viên báo giá riêng sau. */
  price: number | null;
  badge?: string;
}

export interface CommissionFieldConfig {
  id: string;
  key: string;
  /** Tên trường hiển thị trên UI (VD: Độ phức tạp nhân vật, Loại hoạt ảnh...) */
  fieldName: string;
  description: string;
  /** Kiểu render động: 'radio' (RadioGroup) hoặc 'select' (Dropdown <select>) */
  renderType: CommissionFieldRenderType;
  required: boolean;
  options: CommissionOptionConfig[];
}

export const COMMISSION_BASE_PRICE = 500000;

/**
 * Mảng cấu hình động (Data-Driven Form Configs) mô phỏng dữ liệu trả về từ Backend
 * khi Admin/Manager cấu hình thêm/bớt tiêu chí & bảng giá Commission.
 *
 * Mọi Form Yêu cầu Commission (Customer) và Form Báo Giá (Staff) đều dùng
 * `commissionConfigs.map(...)` để tự động render các `<select>` hoặc `<RadioGroup>`.
 */
export const commissionConfigs: CommissionFieldConfig[] = [
  {
    id: "cfg-character-design",
    key: "characterDesign",
    fieldName: "Loại thiết kế nhân vật",
    description: "Chọn thiết kế mới hoàn toàn hoặc thiết kế lại từ nhân vật có sẵn",
    renderType: "radio",
    required: true,
    options: [
      {
        id: "opt-design-new",
        value: "new",
        label: "Nhân vật mới hoàn toàn",
        price: 500000,
        badge: "Phổ biến",
      },
      {
        id: "opt-design-redesign",
        value: "redesign",
        label: "Thiết kế lại nhân vật có sẵn (Redesign)",
        price: 350000,
      },
    ],
  },
  {
    id: "cfg-complexity",
    key: "complexity",
    fieldName: "Độ phức tạp nhân vật",
    description: "Mức độ chi tiết của trang phục, giáp, vảy hoặc phụ kiện trên nhân vật",
    renderType: "radio",
    required: true,
    options: [
      {
        id: "opt-comp-simple",
        value: "simple",
        label: "Đơn giản (Chibi / Tối giản)",
        price: 0,
      },
      {
        id: "opt-comp-standard",
        value: "standard",
        label: "Tiêu chuẩn (Pixel 32x32 - 64x64)",
        price: 150000,
        badge: "Khuyên dùng",
      },
      {
        id: "opt-comp-complex",
        value: "complex",
        label: "Phức tạp (Chi tiết cao / Giáp & Vũ khí lớn)",
        price: 400000,
      },
    ],
  },
  {
    id: "cfg-animation",
    key: "animation",
    fieldName: "Loại hoạt ảnh",
    description: "Nhân vật đứng yên (tĩnh) hoặc có chuyển động lặp trên bảng LED",
    renderType: "radio",
    required: true,
    options: [
      {
        id: "opt-anim-static",
        value: "static",
        label: "Nhân vật tĩnh (Static Sprite)",
        price: 0,
      },
      {
        id: "opt-anim-simple",
        value: "simple-animation",
        label: "Hoạt ảnh cơ bản (Thở / Nhấp nháy / Vẫy tay)",
        price: 250000,
      },
      {
        id: "opt-anim-complex",
        value: "complex-animation",
        label: "Hoạt ảnh phức tạp (Tung chiêu / Chuyển động cánh & lửa)",
        price: 600000,
      },
    ],
  },
  {
    id: "cfg-frames",
    key: "frames",
    fieldName: "Số khung hình hoạt ảnh",
    description: "Số lượng frame chuyển động cho chu kỳ lặp (Loop Animation)",
    renderType: "select",
    required: true,
    options: [
      {
        id: "opt-frame-static",
        value: "static",
        label: "1 khung hình (Ảnh tĩnh)",
        price: 0,
      },
      {
        id: "opt-frame-2-4",
        value: "2-4",
        label: "2 – 4 khung hình mượt vừa",
        price: 100000,
      },
      {
        id: "opt-frame-5-8",
        value: "5-8",
        label: "5 – 8 khung hình siêu mượt",
        price: 250000,
      },
    ],
  },
  {
    id: "cfg-details",
    key: "details",
    fieldName: "Chi tiết và phụ kiện thêm",
    description: "Hiệu ứng hạt sáng, lửa cháy, hào quang hoặc đạo cụ đi kèm",
    renderType: "select",
    required: true,
    options: [
      {
        id: "opt-det-basic",
        value: "basic",
        label: "Phụ kiện cơ bản",
        price: 0,
      },
      {
        id: "opt-det-outfit",
        value: "outfit",
        label: "Trang phục nhiều lớp phức tạp",
        price: 200000,
      },
      {
        id: "opt-det-effects",
        value: "effects",
        label: "Hiệu ứng đặc biệt (Lửa, Điện, Ánh sáng LED)",
        price: 300000,
      },
      {
        id: "opt-det-props",
        value: "props",
        label: "Đạo cụ tùy chỉnh theo yêu cầu",
        price: 250000,
      },
    ],
  },
  {
    id: "cfg-background",
    key: "background",
    fieldName: "Phông nền / Bối cảnh",
    description: "Mức độ chi tiết của cảnh nền hiển thị phía sau nhân vật trên bảng LED",
    renderType: "select",
    required: true,
    options: [
      {
        id: "opt-bg-transparent",
        value: "transparent",
        label: "Nền trong suốt / Nền đen chuẩn LED Matrix",
        price: 0,
      },
      {
        id: "opt-bg-simple",
        value: "simple",
        label: "Nền đơn giản (Bầu trời sao / Gradient Pixel)",
        price: 150000,
      },
      {
        id: "opt-bg-detailed",
        value: "detailed",
        label: "Bối cảnh chi tiết (Nhân viên thẩm định & báo giá)",
        price: null,
      },
    ],
  },
  {
    id: "cfg-characters",
    key: "characters",
    fieldName: "Số lượng nhân vật bổ sung",
    description: "Thêm nhân vật phụ hoặc thú cưng (Pet) xuất hiện chung khung hình",
    renderType: "select",
    required: true,
    options: [
      {
        id: "opt-char-one",
        value: "one",
        label: "01 Nhân vật chính",
        price: 0,
      },
      {
        id: "opt-char-plus1",
        value: "plus-one",
        label: "+1 Nhân vật phụ / Thú cưng",
        price: 400000,
      },
      {
        id: "opt-char-plus2",
        value: "plus-two",
        label: "+2 Nhân vật phụ",
        price: 750000,
      },
    ],
  },
  {
    id: "cfg-priority",
    key: "priority",
    fieldName: "Mức ưu tiên giao hàng",
    description: "Thời gian hoàn thiện bản vẽ Preview mong muốn",
    renderType: "radio",
    required: true,
    options: [
      {
        id: "opt-prio-standard",
        value: "standard",
        label: "Tiêu chuẩn (5 – 7 ngày làm việc)",
        price: 0,
      },
      {
        id: "opt-prio-rush",
        value: "rush",
        label: "Ưu tiên Gấp (48 giờ - Rush Order)",
        price: 300000,
        badge: "Nhanh",
      },
    ],
  },
  {
    id: "cfg-license",
    key: "license",
    fieldName: "Giấy phép sử dụng",
    description: "Phạm vi bản quyền sử dụng tác phẩm sau khi bàn giao",
    renderType: "select",
    required: true,
    options: [
      {
        id: "opt-lic-personal",
        value: "personal",
        label: "Sử dụng cá nhân (Trưng bày thiết bị LED cá nhân)",
        price: 0,
      },
      {
        id: "opt-lic-commercial",
        value: "commercial",
        label: "Sử dụng thương mại (Cửa hàng / Thương hiệu / Stream)",
        price: 500000,
      },
    ],
  },
  {
    id: "cfg-deliverables",
    key: "deliverables",
    fieldName: "Sản phẩm bàn giao thêm",
    description: "Các gói tệp đính kèm ngoài file chuẩn hiển thị LED",
    renderType: "select",
    required: true,
    options: [
      {
        id: "opt-deliv-standard",
        value: "standard",
        label: "Đầu ra tiêu chuẩn (.PNG & .GIF chuẩn LED)",
        price: 0,
      },
      {
        id: "opt-deliv-expression",
        value: "expression",
        label: "Thêm bộ biểu cảm khuôn mặt",
        price: 120000,
      },
      {
        id: "opt-deliv-pose",
        value: "pose",
        label: "Tư thế / Bảng màu thay thế (Alt Palette)",
        price: 150000,
      },
      {
        id: "opt-deliv-source",
        value: "source",
        label: "Kèm File nguồn (.ASE / Aseprite Layer)",
        price: 250000,
      },
    ],
  },
];

const CONFIG_STORAGE_KEY = "mirage-commission-dynamic-configs-v1";

export function loadCommissionConfigs(): CommissionFieldConfig[] {
  if (typeof window === "undefined") return commissionConfigs;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return commissionConfigs;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : commissionConfigs;
  } catch {
    return commissionConfigs;
  }
}

export function saveCommissionConfigs(nextConfigs: CommissionFieldConfig[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfigs));
  window.dispatchEvent(new Event("mirage-commission-configs-updated"));
}

/**
 * Tính toán tổng chi phí tự động dựa trên mảng cấu hình `configs` và `selections` hiện tại.
 */
export function calculateDynamicCommissionQuote(
  selections: Record<string, string | undefined>,
  configs: CommissionFieldConfig[] = commissionConfigs,
  basePrice: number = COMMISSION_BASE_PRICE
) {
  let surchargeTotal = 0;
  let needsCustomQuote = false;
  const breakdown: Array<{
    fieldKey: string;
    fieldName: string;
    optionLabel: string;
    price: number | null;
  }> = [];

  configs.forEach((field) => {
    const selectedValue = selections[field.key];
    if (!selectedValue) return;
    const matchedOption = field.options.find((opt) => opt.value === selectedValue);
    if (!matchedOption) return;

    if (matchedOption.price === null) {
      needsCustomQuote = true;
    } else {
      surchargeTotal += matchedOption.price;
    }

    breakdown.push({
      fieldKey: field.key,
      fieldName: field.fieldName,
      optionLabel: matchedOption.label,
      price: matchedOption.price,
    });
  });

  return {
    basePrice,
    surchargeTotal,
    total: basePrice + surchargeTotal,
    needsCustomQuote,
    breakdown,
  };
}

/**
 * Tạo chuỗi tóm tắt các thông số đã chọn từ `commissionConfigs` để hiển thị trên Thẻ Báo Giá.
 */
export function buildSpecsSummaryFromConfigs(
  selections: Record<string, string | undefined>,
  configs: CommissionFieldConfig[] = commissionConfigs
): string {
  const parts = configs
    .map((field) => {
      const val = selections[field.key];
      const opt = field.options.find((o) => o.value === val);
      return opt ? `${field.fieldName}: ${opt.label}` : null;
    })
    .filter(Boolean);

  return parts.join(" • ");
}

