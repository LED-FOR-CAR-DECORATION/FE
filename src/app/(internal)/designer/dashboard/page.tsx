"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, FilePenLine, Layers3 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCommissionRequests } from "@/features/commission/hooks/useCommissionRequests";
import type { DesignerCommissionStatus } from "@/features/commission/types";

const labels: Record<DesignerCommissionStatus, string> = {
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang thực hiện",
  SUBMITTED_FOR_REVIEW: "Chờ nhân viên duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  APPROVED: "Đã duyệt",
  COMPLETED: "Hoàn tất",
};

export default function DesignerDashboardPage() {
  const { user } = useAuth();
  const { requests } = useCommissionRequests();
  const assigned = useMemo(() => requests.filter((request) => request.assignedDesignerId === user?.userId), [requests, user?.userId]);
  const count = (status: DesignerCommissionStatus) => assigned.filter((request) => request.designerStatus === status).length;
  const feedback = assigned.flatMap((request) => (request.submissions ?? []).filter((submission) => submission.feedback).map((submission) => ({ request, submission }))).slice(0, 4);

  return <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 pb-8"><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#198653]">Không gian làm việc của nhà thiết kế</p><h1 className="mt-1 text-3xl font-black text-[#173b28]">Xin chào, {user?.fullName}</h1><p className="mt-1 text-sm text-[#66736b]">Theo dõi commission được phân công và phản hồi từ nhân viên.</p></header><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Commission được giao" value={assigned.length} icon={<Layers3 size={18} />} /><Metric label="Đang thực hiện" value={count("IN_PROGRESS") + count("ASSIGNED")} icon={<FilePenLine size={18} />} /><Metric label="Chờ nhân viên duyệt" value={count("SUBMITTED_FOR_REVIEW")} icon={<Clock3 size={18} />} /><Metric label="Cần chỉnh sửa" value={count("CHANGES_REQUESTED")} icon={<CheckCircle2 size={18} />} /></div><div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]"><section className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e5eee6] px-5 py-4"><div><h2 className="font-black text-[#173b28]">Commission gần đây</h2><p className="mt-1 text-xs text-[#66736b]">Chỉ hiển thị yêu cầu được gán cho bạn</p></div><Link href="/designer/commissions" className="text-xs font-black text-[#198653] hover:underline">Xem tất cả</Link></div><div className="divide-y divide-[#eef3ef]">{assigned.slice(0, 5).map((request) => <Link key={request.id} href={`/designer/commissions/${request.id}`} className="block px-5 py-4 transition hover:bg-[#f6fbf7]"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-[#155e59]">{request.id}</span><span className="rounded-full bg-[#edf7ef] px-2.5 py-1 text-[10px] font-bold text-[#198653]">{labels[request.designerStatus ?? "ASSIGNED"]}</span></div><p className="mt-2 font-bold text-[#26352f]">{request.customerName} · Commission nhân vật</p><p className="mt-1 text-xs text-[#66736b]">Phân công {request.assignmentDate ? new Date(request.assignmentDate).toLocaleDateString("vi-VN") : "chưa cập nhật"}</p></Link>)}{assigned.length === 0 && <Empty text="Chưa có commission được phân công." />}</div></section><section className="rounded-2xl border border-[#dce8df] bg-white shadow-sm"><div className="border-b border-[#e5eee6] px-5 py-4"><h2 className="font-black text-[#173b28]">Phản hồi gần đây</h2><p className="mt-1 text-xs text-[#66736b]">Phản hồi từ nhân viên cho các bản thiết kế</p></div><div className="divide-y divide-[#eef3ef]">{feedback.map(({ request, submission }) => <Link key={submission.id} href={`/designer/commissions/${request.id}/submissions/${submission.id}`} className="block px-5 py-4 hover:bg-[#f6fbf7]"><p className="text-xs font-black text-[#155e59]">{request.id} · v{submission.version}</p><p className="mt-1 line-clamp-2 text-sm text-[#26352f]">{submission.feedback}</p></Link>)}{feedback.length === 0 && <Empty text="Chưa có phản hồi mới." />}</div></section></div></div>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf7ef] text-[#198653]">{icon}</span><p className="mt-3 text-xs font-bold text-[#66736b]">{label}</p><p className="mt-1 text-2xl font-black text-[#173b28]">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-[#66736b]">{text}</div>;
}
