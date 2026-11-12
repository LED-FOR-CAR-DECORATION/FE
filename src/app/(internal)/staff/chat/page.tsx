import type { Metadata } from "next";
import StaffCommissionChat from "@/features/commission-chat/components/StaffCommissionChat";

export const metadata: Metadata = {
  title: "Quản lý Chat & Chốt đơn Commission | MIRAGE Staff",
  description:
    "Không gian quản lý hội thoại khách hàng, tạo Form báo giá Commission và cập nhật tiến độ đơn vẽ dành cho Nhân viên MIRAGE.",
};

export default function StaffCommissionChatPage() {
  return <StaffCommissionChat />;
}
