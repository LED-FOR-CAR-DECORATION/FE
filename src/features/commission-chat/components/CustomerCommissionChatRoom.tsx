"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import CommissionChatRoom from "./CommissionChatRoom";

/** Chỉ mở phòng chat khi đã xác định là tài khoản CUSTOMER (tránh gọi API khi phiên chưa sẵn sàng). */
export default function CustomerCommissionChatRoom({ commissionId }: { commissionId: number }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status">Đang tải…</p>;
  if (user?.role !== "CUSTOMER") return <p>Đăng nhập bằng tài khoản khách hàng để vào phòng chat.</p>;
  return <CommissionChatRoom key={`${user.userId}:${commissionId}`} commissionId={commissionId} viewer="CUSTOMER" />;
}
