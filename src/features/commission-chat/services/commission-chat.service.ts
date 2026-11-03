import type { Conversation } from "../types";

const STORAGE_KEY = "mirage-commission-chat-conversations-v1";

export const formatVND = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;
export const formatVNDFull = (amount: number) => `${amount.toLocaleString("vi-VN")} VNĐ`;

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    customerName: "Nguyễn Minh Anh",
    customerAvatar: "MA",
    staffName: "Hoàng Bảo (Mirage Staff)",
    staffAvatar: "HB",
    online: true,
    lastMessage: "Bản vẽ Preview cho nhân vật Rồng Lửa đã hoàn thành!",
    lastTime: "10:45",
    unreadCount: 1,
    orderState: "REVIEW",
    progressStep: "REVIEWING",
    commission: {
      characterName: "Rồng Lửa",
      description:
        "Pixel Art 64x64px, hiệu ứng lửa cháy quanh cánh, tông màu đỏ cam rực rỡ tương thích bảng LED Matrix 64x64.",
      price: 500000,
      deliveryDate: "2026-11-10",
      isPaid: false,
      isApproved: false,
    },
    messages: [
      {
        id: "m-1",
        sender: "CUSTOMER",
        text: "Chào shop! Mình muốn đặt vẽ một bé Rồng Lửa theo phong cách Pixel Art để hiển thị lên bảng LED 64x64 của MIRAGE ạ.",
        time: "09:15",
      },
      {
        id: "m-2",
        sender: "STAFF",
        text: "Chào Minh Anh! MIRAGE rất vui được hỗ trợ bạn. Bạn muốn Rồng Lửa có hiệu ứng chuyển động cánh hay phun lửa không ạ?",
        time: "09:17",
      },
      {
        id: "m-3",
        sender: "CUSTOMER",
        text: "Mình muốn tư thế đang vỗ cánh kèm lửa rực xung quanh nhé, tông màu chủ đạo đỏ - cam nổi bật trên nền tối.",
        time: "09:20",
      },
      {
        id: "m-4",
        sender: "STAFF",
        text: "Dạ mình đã nắm rõ ý tưởng! Mình gửi bạn thẻ báo giá chi tiết bên dưới nhé:",
        time: "09:25",
      },
      {
        id: "m-5",
        sender: "SYSTEM",
        time: "09:26",
        quoteCard: {
          characterName: "Rồng Lửa",
          description:
            "Pixel Art 64x64px, hiệu ứng lửa cháy quanh cánh, tông màu đỏ cam rực rỡ tương thích bảng LED Matrix 64x64.",
          price: 500000,
          deliveryDate: "2026-11-10",
          isPaid: false,
        },
      },
      {
        id: "m-6",
        sender: "STAFF",
        text: "Bản vẽ Preview cho nhân vật Rồng Lửa đã hoàn thành! Bạn kiểm tra và nghiệm thu ở bảng thông tin bên phải màn hình nhé.",
        time: "10:45",
      },
    ],
  },
  {
    id: "conv-2",
    customerName: "Trần Hoàng Nam",
    customerAvatar: "HN",
    staffName: "Minh Thư (Mirage Staff)",
    staffAvatar: "MT",
    online: true,
    lastMessage: "Đơn đang trong giai đoạn phác thảo khung hình Pixel.",
    lastTime: "Hôm qua",
    orderState: "IN_PROGRESS",
    progressStep: "DRAWING",
    commission: {
      characterName: "Mèo Thần Tài Cyberpunk",
      description:
        "Hoạt ảnh vẫy tay 4 khung hình, đeo kính neon xanh lá, kích thước 32x32px.",
      price: 500000,
      deliveryDate: "2026-11-12",
      isPaid: true,
      isApproved: false,
    },
    messages: [
      {
        id: "m-201",
        sender: "CUSTOMER",
        text: "Shop ơi, mình muốn đặt vẽ Mèo Thần Tài phong cách Cyberpunk để treo quầy thu ngân.",
        time: "Hôm qua",
      },
      {
        id: "m-202",
        sender: "SYSTEM",
        time: "Hôm qua",
        quoteCard: {
          characterName: "Mèo Thần Tài Cyberpunk",
          description:
            "Hoạt ảnh vẫy tay 4 khung hình, đeo kính neon xanh lá, kích thước 32x32px.",
          price: 500000,
          deliveryDate: "2026-11-12",
          isPaid: true,
        },
      },
      {
        id: "m-203",
        sender: "STAFF",
        text: "Cảm ơn bạn! Đội ngũ Artist đang tiến hành vẽ khung hình chuyển động cho đơn của bạn rồi nhé.",
        time: "Hôm qua",
      },
    ],
  },
  {
    id: "conv-3",
    customerName: "Lê Thu Hà",
    customerAvatar: "TH",
    staffName: "Quốc Khánh (Mirage Staff)",
    staffAvatar: "QK",
    online: false,
    lastMessage: "Tư vấn giúp mình gói vẽ nhân vật Hiệp Sĩ Ánh Sáng nhé!",
    lastTime: "Thứ 2",
    orderState: "NO_ORDER",
    progressStep: "WAITING_PAYMENT",
    commission: {
      characterName: "Hiệp Sĩ Ánh Sáng",
      description: "",
      price: 500000,
      deliveryDate: "2026-11-15",
      isPaid: false,
      isApproved: false,
    },
    messages: [
      {
        id: "m-301",
        sender: "CUSTOMER",
        text: "Chào MIRAGE, tư vấn giúp mình gói vẽ nhân vật Hiệp Sĩ Ánh Sáng để nạp vào khung LED để bàn nhé!",
        time: "Thứ 2",
      },
      {
        id: "m-302",
        sender: "STAFF",
        text: "Chào bạn! Bạn chia sẻ thêm về màu sắc giáp và vũ khí mong muốn để mình tạo Form Commission báo giá ngay cho bạn nhé.",
        time: "Thứ 2",
      },
    ],
  },
];

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return INITIAL_CONVERSATIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_CONVERSATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CONVERSATIONS;
  } catch {
    return INITIAL_CONVERSATIONS;
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    window.dispatchEvent(new Event("mirage-commission-chat-updated"));
  } catch {
    // ignore storage quota errors
  }
}

