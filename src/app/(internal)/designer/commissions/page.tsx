"use client";

import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCommissionRequests } from "@/features/commission/hooks/useCommissionRequests";
import type { DesignerCommissionStatus } from "@/features/commission/types";

const statuses: Array<DesignerCommissionStatus | "ALL"> = ["ALL", "ASSIGNED", "IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "CHANGES_REQUESTED", "APPROVED"];
const statusLabels: Record<DesignerCommissionStatus | "ALL", string> = { ALL: "Tất cả", ASSIGNED: "Đã phân công", IN_PROGRESS: "Đang thực hiện", SUBMITTED_FOR_REVIEW: "Chờ duyệt", CHANGES_REQUESTED: "Cần chỉnh sửa", APPROVED: "Đã duyệt", COMPLETED: "Hoàn tất" };

export default function DesignerCommissionsPage() {
  const { user } = useAuth();
  const { requests } = useCommissionRequests();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DesignerCommissionStatus | "ALL">("ALL");
  const assigned = useMemo(() => requests.filter((request) => request.assignedDesignerId === user?.userId).filter((request) => {
    const matchesQuery = !query.trim() || request.id.toLowerCase().includes(query.toLowerCase()) || request.customerName.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "ALL" || request.designerStatus === filter);
  }), [filter, query, requests, user?.userId]);

  return <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 pb-8"><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#198653]">Không gian làm việc của nhà thiết kế</p><h1 className="mt-1 text-3xl font-black text-[#173b28]">Commission được giao</h1><p className="mt-1 text-sm text-[#66736b]">Đọc yêu cầu, quản lý bản thiết kế và gửi nhân viên duyệt.</p></header><section className="flex flex-col gap-3 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm md:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-[#dce8df] px-3"><Search size={16} className="text-[#7a8c80]" /><span className="sr-only">Tìm commission</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo mã commission hoặc khách hàng..." className="w-full bg-transparent py-2.5 text-sm outline-none" /></label><select value={filter} onChange={(event) => setFilter(event.target.value as DesignerCommissionStatus | "ALL")} className="rounded-xl border border-[#dce8df] bg-white px-3 py-2.5 text-sm font-bold text-[#26352f] outline-none"><option value="ALL">Tất cả trạng thái</option>{statuses.slice(1).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></section><section className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-[#f6fbf7]"><tr>{["Commission", "Yêu cầu", "Phân công", "Trạng thái", "Bản mới nhất", ""].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wide text-[#7a8c80]">{heading}</th>)}</tr></thead><tbody>{assigned.map((request) => { const latest = request.submissions?.at(-1); return <tr key={request.id} className="border-t border-[#eef3ef] hover:bg-[#fbfdfb]"><td className="px-5 py-4"><span className="rounded-md bg-[#edf7ef] px-2 py-1 text-xs font-black text-[#155e59]">{request.id}</span><p className="mt-2 font-bold">{request.customerName}</p></td><td className="max-w-[260px] px-5 py-4 text-xs leading-5 text-[#66736b]">{request.note || "Yêu cầu theo các lựa chọn commission"}</td><td className="whitespace-nowrap px-5 py-4 text-xs text-[#66736b]">{request.assignmentDate ? new Date(request.assignmentDate).toLocaleDateString("vi-VN") : "—"}</td><td className="px-5 py-4"><span className="whitespace-nowrap rounded-full bg-[#edf7ef] px-2.5 py-1 text-[11px] font-bold text-[#198653]">{statusLabels[request.designerStatus ?? "ASSIGNED"]}</span></td><td className="px-5 py-4 text-xs text-[#66736b]">{latest ? `v${latest.version} · ${latest.status === "APPROVED" ? "Đã duyệt" : latest.status === "CHANGES_REQUESTED" ? "Cần sửa" : "Chờ duyệt"}` : "Chưa gửi"}</td><td className="px-5 py-4"><Link href={`/designer/commissions/${request.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe3d0] px-3 py-2 text-xs font-black text-[#155e59] hover:bg-[#edf7ef]"><Eye size={14} /> Mở không gian làm việc</Link></td></tr>; })}{assigned.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-[#66736b]">Không có commission phù hợp.</td></tr>}</tbody></table></div></section></div>;
}
