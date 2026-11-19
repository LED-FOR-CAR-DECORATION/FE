import type { Metadata } from "next";
import { Suspense } from "react";
import StaffInbox from "@/features/commission-chat/components/StaffInbox";

export const metadata: Metadata = {
  title: "Tin nhắn khách hàng | MIRAGE Staff",
};

export default function StaffChatPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6 text-sm">Đang tải tin nhắn…</p>}>
      <StaffInbox />
    </Suspense>
  );
}
