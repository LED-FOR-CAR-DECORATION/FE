"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { use } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCommissionRequests } from "@/features/commission/hooks/useCommissionRequests";

export default function DesignerSubmissionDetailsPage({ params }: { params: Promise<{ commissionId: string; submissionId: string }> }) {
  const { commissionId, submissionId } = use(params);
  const { user } = useAuth();
  const { requests } = useCommissionRequests();
  const request = requests.find((entry) => entry.id === commissionId && entry.assignedDesignerId === user?.userId);
  const submission = request?.submissions?.find((entry) => entry.id === submissionId);
  if (!request || !submission) return <div className="py-16 text-center"><p className="font-black">Không tìm thấy bản nộp.</p><Link href="/designer/commissions" className="mt-4 inline-block text-sm font-bold text-[#198653]">Về danh sách</Link></div>;
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8"><Link href={`/designer/commissions/${request.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#155e59]"><ArrowLeft size={15} /> Về không gian làm việc</Link><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#198653]">{request.id}</p><h1 className="mt-1 text-2xl font-black text-[#173b28]">Bản nộp v{submission.version}</h1><p className="mt-1 text-sm text-[#66736b]">{new Date(submission.createdAt).toLocaleString("vi-VN")}</p></header><section className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm"><div className="flex items-center gap-3 rounded-xl bg-[#f6fbf7] p-4"><FileText className="text-[#198653]" /><div><p className="font-bold">{submission.title}</p><p className="text-xs text-[#66736b]">{submission.file.name} · {(submission.file.size / 1024 / 1024).toFixed(2)} MB</p></div></div>{submission.file.dataUrl && <img src={submission.file.dataUrl} alt={submission.title} className="mt-5 max-h-96 w-full rounded-xl bg-[#f8fbf8] object-contain" />}<div className="mt-5 rounded-xl border border-[#dce8df] p-4"><p className="text-xs font-black text-[#155e59]">Trạng thái</p><p className="mt-1 text-sm font-bold">{submission.status === "CHANGES_REQUESTED" ? "Nhân viên yêu cầu chỉnh sửa" : submission.status === "APPROVED" ? "Đã được nhân viên duyệt" : "Đang chờ nhân viên duyệt"}</p></div>{submission.note && <div className="mt-4"><p className="text-xs font-black text-[#155e59]">Ghi chú bản nộp</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{submission.note}</p></div>}{submission.feedback && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-800">Phản hồi từ nhân viên</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-950">{submission.feedback}</p></div>}</section>{submission.status === "CHANGES_REQUESTED" && <Link href={`/designer/commissions/${request.id}/design`} className="inline-flex w-fit rounded-lg bg-[#198653] px-4 py-2.5 text-sm font-black text-white">Tạo bản chỉnh sửa</Link>}</div>;
}
