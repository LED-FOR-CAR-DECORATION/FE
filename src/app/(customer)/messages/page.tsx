import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import CustomerInbox from "@/features/commission-chat/components/CustomerInbox";

export const metadata: Metadata = {
  title: "Tin nhắn | LUMINTRA",
  description: "Trao đổi với nhân viên LUMINTRA về các yêu cầu thiết kế riêng của bạn.",
};

/** Hộp thư kiểu Messenger: chiếm trọn chiều cao còn lại dưới Header, không có Footer. */
export default function CustomerMessagesPage() {
  return (
    <div className="flex h-dvh flex-col bg-background text-text-main">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col p-3 md:p-5">
        <Suspense
          fallback={
            <div className="neo-box-no-hover flex flex-1 items-center justify-center bg-white p-6 text-sm font-bold text-text-muted">
              Đang tải tin nhắn…
            </div>
          }
        >
          <CustomerInbox />
        </Suspense>
      </main>
    </div>
  );
}
