import type { Metadata } from "next";
import CustomerCommissionChat from "@/features/commission-chat/components/CustomerCommissionChat";

export const metadata: Metadata = {
  title: "Chat ngay & Nghiệm thu Commission | MIRAGE",
  description:
    "Không gian trao đổi ý tưởng nhân vật Pixel Art, thanh toán báo giá và nghiệm thu bản vẽ dành cho Khách hàng MIRAGE.",
};

export default function CustomerCommissionChatPage() {
  return <CustomerCommissionChat />;
}
