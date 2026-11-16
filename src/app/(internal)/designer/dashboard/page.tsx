"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DesignerDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/designer/characters");
  }, [router]);

  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-[#66736b]">
      Đang chuyển đến không gian tạo nhân vật...
    </div>
  );
}
