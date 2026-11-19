import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import CustomerInbox from "@/features/commission-chat/components/CustomerInbox";

export const metadata: Metadata = {
  title: "Tin nhắn | MIRAGE",
  description: "Trao đổi với nhân viên MIRAGE về các commission thiết kế nhân vật của bạn.",
};

/** Hộp thư kiểu Messenger: chiếm trọn chiều cao còn lại dưới Header, không có Footer. */
export default function CustomerMessagesPage() {
  return (
    <div className="flex h-dvh flex-col bg-[#f5f5f5] text-[#26352f]">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col p-3 md:p-5">
        <Suspense fallback={<p role="status" className="p-6 text-sm">Đang tải tin nhắn…</p>}>
          <CustomerInbox />
        </Suspense>
      </main>
    </div>
  );
}
