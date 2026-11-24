/**
 * Thông tin công khai của cửa hàng — dùng ở Footer, trang Liên hệ, Giới thiệu và các trang chính sách.
 * Sửa ở đây là đủ, không cần sửa từng trang.
 *
 * TODO: thay các giá trị đánh dấu TODO bằng thông tin thật của nhóm trước khi demo/triển khai.
 */
export const SITE = {
  name: "LUMINTRA",
  team: "Lumintra Team",
  tagline: "Bảng LED ma trận trang trí xe và chợ nhân vật Pixel Art",
  description:
    "Lumintra mang đến bảng LED ma trận gắn kính xe, thư viện nhân vật Pixel Art và dịch vụ thiết kế nhân vật theo yêu cầu, để mỗi chiếc xe thể hiện cá tính riêng.",

  contact: {
    /** TODO: địa chỉ thật — cũng là địa chỉ hiển thị trên Google Map. */
    address: "Trường Đại học FPT, Lô E2a-7, Đường D1, Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh",
    /** TODO: số điện thoại thật (dạng hiển thị) và dạng gọi được. */
    phone: "0900 000 000",
    phoneHref: "tel:+84900000000",
    /** TODO: email hỗ trợ thật. */
    email: "support@lumintra.example",
    hours: "Thứ 2 – Thứ 7, 8:00 – 17:30",
  },

  /** TODO: link trang mạng xã hội thật của nhóm. */
  social: {
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    x: "https://x.com/",
  },
} as const;

/** Google Maps nhúng không cần API key (dạng ?q=…&output=embed). */
export const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(SITE.contact.address)}&output=embed`;
export const MAP_LINK_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.contact.address)}`;

/** Các trang thông tin công khai (Footer + điều hướng giữa các trang chính sách). */
export const INFO_LINKS = [
  { href: "/about", label: "Về chúng tôi" },
  { href: "/support", label: "Hỗ trợ kỹ thuật" },
  { href: "/shipping-returns", label: "Vận chuyển & đổi trả" },
  { href: "/terms", label: "Điều khoản dịch vụ" },
  { href: "/privacy", label: "Chính sách bảo mật" },
  { href: "/contact", label: "Liên hệ" },
] as const;

export const SHOP_LINKS = [
  { href: "/products", label: "Cửa hàng" },
  { href: "/subscriptions", label: "Gói hội viên" },
  { href: "/commission/new", label: "Thiết kế nhân vật theo yêu cầu" },
  { href: "/messages", label: "Tin nhắn" },
] as const;
