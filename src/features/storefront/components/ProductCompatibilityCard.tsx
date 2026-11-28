"use client";

import type { LucideIcon } from "lucide-react";
import {
  Check,
  Cpu,
  Crown,
  Download,
  Monitor,
  Package,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { CatalogProduct } from "@/features/cart/catalog";
import { formatPrice } from "@/lib/currency";

interface CompatibilityHighlight {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface CompatibilityViewModel {
  headingIcon: LucideIcon;
  heading: string;
  summary: string;
  checklist: string[];
  highlights: CompatibilityHighlight[];
}

function buildCompatibilityViewModel(item: CatalogProduct): CompatibilityViewModel {
  if (item.productType === "LED_MODEL") {
    const specs = item.ledDetails?.specifications ?? {};
    const resolution =
      specs.resolution ?? specs.dimensions ?? specs.matrixSize ?? specs.size ?? null;
    const connectivity =
      specs.connectivity ?? specs.connection ?? "Bluetooth (BLE) & Wi-Fi";
    const modelLabel = item.ledDetails?.modelName || item.name;
    const stock = item.ledDetails?.stockQuantity;

    const checklist: string[] = [
      `Phần cứng chính hãng: ${modelLabel}`,
      ...(resolution ? [`Độ phân giải tấm LED: ${String(resolution)}`] : []),
      `Kết nối điều khiển: ${Array.isArray(connectivity) ? connectivity.join(", ") : String(connectivity)}`,
      "Hiển thị ảnh động GIF & tranh Pixel từ ứng dụng Lumintra Mobile",
      ...(typeof stock === "number"
        ? [stock > 0 ? `Tồn kho sẵn sàng giao: ${stock} thiết bị` : "Tạm hết hàng trong kho"]
        : []),
    ];

    return {
      headingIcon: Cpu,
      heading: "Tương thích & Kết nối",
      summary:
        "Thiết bị tấm LED Lumintra, ghép nối trực tiếp với điện thoại qua ứng dụng Lumintra Mobile.",
      checklist,
      highlights: [
        {
          icon: Smartphone,
          title: "Truyền ảnh qua BLE",
          desc: "Chiếu ảnh động GIF từ ứng dụng Lumintra Mobile lên tấm LED tức thì.",
        },
        {
          icon: ShieldCheck,
          title: "Bảo hành chính hãng",
          desc: "Quản lý thiết bị & gửi yêu cầu bảo hành theo mã Serial.",
        },
      ],
    };
  }

  if (item.productType === "BUNDLE") {
    const bundleItems = item.bundleDetails?.items ?? [];
    const hasLed = bundleItems.some((bi) => bi.itemType === "LED");
    const hasCharacter = bundleItems.some((bi) => bi.itemType === "CHARACTER");
    const originalPrice = Number(item.bundleDetails?.originalPrice ?? 0);
    const savedAmount = originalPrice > item.price ? originalPrice - item.price : 0;

    const checklist: string[] =
      bundleItems.length > 0
        ? bundleItems.map((bi) => {
            const name = bi.modelName ?? bi.characterName ?? "Sản phẩm trong gói";
            const kind = bi.itemType === "LED" ? "Tấm LED" : "Nhân vật GIF";
            return `${name} (${kind} ×${bi.quantity})`;
          })
        : [
            "Bao gồm trọn bộ sản phẩm đồng bộ trong gói Combo",
            "Tương thích đầy đủ trên hệ sinh thái tấm LED Lumintra",
            "Điều khiển đồng bộ qua ứng dụng Lumintra Mobile",
          ];

    const summary =
      hasLed && hasCharacter
        ? "Gói kết hợp tấm LED và nhân vật Pixel đồng bộ sẵn sàng trình chiếu."
        : hasLed
          ? "Gói tấm LED Lumintra chính hãng kèm đầy đủ kết nối qua ứng dụng Lumintra Mobile."
          : "Bộ sưu tập nhân vật Pixel tương thích mọi dòng tấm LED Lumintra.";

    return {
      headingIcon: Package,
      heading: "Thành phần & Tương thích",
      summary,
      checklist,
      highlights: [
        {
          icon: hasLed ? Smartphone : Download,
          title: hasLed ? "Sẵn sàng trình chiếu" : "Kích hoạt tức thì",
          desc: hasLed
            ? "Thiết bị LED giao tận tay, nhân vật mở khóa ngay trong tài khoản."
            : "Tải ảnh động GIF về thiết bị LED qua App trong tích tắc.",
        },
        {
          icon: Sparkles,
          title: savedAmount > 0 ? `Tiết kiệm ${formatPrice(savedAmount)}` : "Ưu đãi trọn bộ",
          desc: "Chi phí tối ưu hơn so với mua lẻ từng sản phẩm riêng biệt.",
        },
      ],
    };
  }

  if (item.productType === "SUBSCRIPTION") {
    const sub = item.subscriptionDetails;
    const isLifetime = Boolean(sub?.isLifetime);
    const durationText = isLifetime
      ? "Hiệu lực vĩnh viễn (Trọn đời)"
      : `Thời hạn sử dụng ${sub?.durationDays ?? 30} ngày`;

    const checklist: string[] = [
      durationText,
      ...(sub?.allAccessCharacters
        ? ["Mở khóa toàn bộ thư viện nhân vật"]
        : []),
      ...((sub?.maxMobileProfiles ?? 3) > 3
        ? [`Tối đa ${sub?.maxMobileProfiles} profile chữ trên ứng dụng Mobile`]
        : []),
      ...((sub?.maxCommissionRevisions ?? 0) > 0
        ? [`${sub?.maxCommissionRevisions} lượt chỉnh sửa miễn phí cho mỗi đơn thiết kế`]
        : []),
      "Tương thích toàn bộ dòng bảng LED Lumintra (32×32, 64×32, 64×64...)",
    ];

    return {
      headingIcon: Crown,
      heading: "Quyền lợi & Tương thích",
      summary:
        "Đặc quyền tài khoản áp dụng xuyên suốt trên Website, Thư viện nhân vật và App Lumintra Mobile.",
      checklist,
      highlights: [
        {
          icon: Sparkles,
          title: "Kích hoạt tự động",
          desc: "Quyền lợi hội viên có hiệu lực ngay sau khi thanh toán thành công.",
        },
        {
          icon: Smartphone,
          title: "Đồng bộ đa thiết bị",
          desc: "Sử dụng trên mọi bảng LED đã ghép nối cùng tài khoản Lumintra.",
        },
      ],
    };
  }

  // CHARACTER (default digital pixel art asset)
  const frameCount = item.characterDetails?.frameCount;
  const frameDelayMs = item.characterDetails?.frameDelayMs;
  const formatLine =
    frameCount && frameCount > 1
      ? `Ảnh động GIF (.gif) · ${frameCount} frames${frameDelayMs ? ` (${frameDelayMs} ms)` : ""}`
      : "Ảnh tĩnh/động định dạng GIF (.gif)";

  return {
    headingIcon: Monitor,
    heading: "Tương thích thiết bị",
    summary:
      "Hoạt động đồng bộ 100% trên các dòng bảng LED ma trận Lumintra và ứng dụng điều khiển Mobile.",
    checklist: [
      "Tất cả bảng LED Lumintra (32×32, 64×32, 64×64...)",
      formatLine,
      "Chiếu trực tiếp qua App Lumintra Mobile (BLE)",
    ],
    highlights: [
      {
        icon: Download,
        title: "Đồng bộ tức thì",
        desc: "Tải ảnh động GIF và phát lên thiết bị LED trong tích tắc.",
      },
      {
        icon: Sparkles,
        title: "Bản quyền trọn đời",
        desc: "Sử dụng vĩnh viễn trong Thư viện nhân vật Lumintra.",
      },
    ],
  };
}

/**
 * Context-aware compatibility & highlights panel on the product detail page,
 * tailored to LED hardware, Pixel Art characters, bundles, and subscriptions.
 */
export function ProductCompatibilityCard({ item }: { item: CatalogProduct }) {
  const view = buildCompatibilityViewModel(item);
  const HeadingIcon = view.headingIcon;

  return (
    <aside className="neo-box-no-hover h-fit bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3 text-xs font-black uppercase tracking-wider text-black">
        <HeadingIcon size={16} className="shrink-0 text-primary-ink" aria-hidden />
        <span>{view.heading}</span>
      </h2>
      <p className="text-xs font-medium leading-relaxed text-text-muted">{view.summary}</p>
      <ul className="mt-4 space-y-2.5 text-xs font-bold text-text-main">
        {view.checklist.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-primary-ink" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <hr className="my-5 border-t-2 border-black" />

      <div className="space-y-3 text-xs">
        {view.highlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <div key={highlight.title} className="flex items-start gap-2.5">
              <Icon size={16} className="mt-0.5 shrink-0 text-primary-ink" aria-hidden />
              <div>
                <strong className="block font-black uppercase">{highlight.title}</strong>
                <span className="text-text-muted">{highlight.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
