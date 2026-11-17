"use client";

import { useEffect, useState } from "react";
import { useCommissionRequests } from "@/features/commission/hooks/useCommissionRequests";
import { assignCommission } from "@/features/commission/services/commission.service";
import { getDemoDesigners, type DemoDesigner } from "@/features/commission/services/demo-designers";
import { formatCommissionMoney } from "@/features/commission/config/fixedPricing";
import type { CommissionRequest } from "@/features/commission/types";

function Assignment({ request, designers }: { request: CommissionRequest; designers: DemoDesigner[] }) {
  const [designerId, setDesignerId] = useState("");
  const [error, setError] = useState("");
  const designer = designers.find((item) => item.userId === designerId);

  if (request.assignedDesignerId) {
    return <p role="status" className="font-semibold text-[#155e59]">Đã phân công: {request.assignedDesignerName}</p>;
  }
  if (request.paymentStatus !== "PAID") {
    return <p className="text-sm text-[#526159]">Có thể phân công khi khách đã thanh toán.</p>;
  }
  if (!designers.length) {
    return <p className="text-sm text-[#526159]">Chưa có designer. Mở mục yêu cầu thiết kế bằng tài khoản designer trên trình duyệt này để thêm vào danh sách demo.</p>;
  }

  return (
    <form className="space-y-2" onSubmit={(event) => {
      event.preventDefault();
      if (designer && !assignCommission(request.id, designer.userId, designer.fullName)) {
        setError("Không thể phân công. Yêu cầu có thể đã được xử lý ở tab khác.");
      }
    }}>
      <label className="block text-sm font-semibold" htmlFor={`designer-${request.id}`}>Designer phụ trách</label>
      <div className="flex flex-wrap gap-2">
        <select id={`designer-${request.id}`} value={designerId} onChange={(event) => {
          setDesignerId(event.target.value);
          setError("");
        }} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#819e8c] bg-white px-3">
          <option value="">Chọn designer</option>
          {designers.map((item) => <option key={item.userId} value={item.userId}>{item.fullName} ({item.userId})</option>)}
        </select>
        <button type="submit" disabled={!designer} className="min-h-11 rounded-lg bg-[#155e59] px-4 font-semibold text-white hover:bg-[#0e4b47] disabled:opacity-50">
          Phân công
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

export default function StaffCommissionPage() {
  const { requests } = useCommissionRequests();
  const [designers, setDesigners] = useState<DemoDesigner[] | null>(null);

  useEffect(() => {
    const refresh = () => setDesigners(getDemoDesigners());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 pb-8 text-[#26352f]">
      <header>
        <h1 className="text-3xl font-black text-[#155e59]">Quản lý yêu cầu thiết kế nhân vật</h1>
        <p className="mt-2 text-sm text-[#526159]">Xem brief và phân công designer. Dữ liệu demo được lưu trên trình duyệt này.</p>
      </header>
      {designers === null ? <p role="status">Đang tải yêu cầu…</p> : requests.length === 0 ? (
        <p className="rounded-xl border border-[#cfe3d0] bg-white p-5">Chưa có yêu cầu thiết kế từ khách hàng.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="grid gap-4 rounded-xl border border-[#cfe3d0] bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-[#155e59]">{request.id} · {request.customerName}</h2>
                  <span className="rounded-full bg-[#eaf5e8] px-2.5 py-1 text-xs font-semibold text-[#155e59]">
                    {request.assignedDesignerId ? "Đã phân công" : request.paymentStatus === "PAID" ? "Chờ phân công" : "Chờ thanh toán"}
                  </span>
                </div>
                <p className="text-sm text-[#526159]">
                  {[
                    request.selections.subject,
                    request.selections.size?.replace("x", " × "),
                    request.selections.format === "gif" ? `GIF · ${request.selections.frames} frame` : request.selections.format === "image" ? "Ảnh tĩnh" : "",
                    request.estimatedPrice !== null ? formatCommissionMoney(request.estimatedPrice) : "",
                  ].filter(Boolean).join(" · ")}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{request.note}</p>
              </div>
              <div className="self-center">
                <Assignment request={request} designers={designers} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
