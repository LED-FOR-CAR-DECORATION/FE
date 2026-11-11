"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import { use, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCommissionRequests } from "@/features/commission/hooks/useCommissionRequests";
import { submitCommissionDesign, updateDesignerStatus } from "@/features/commission/services/commission.service";

export default function DesignerDesignPage({ params }: { params: Promise<{ commissionId: string }> }) {
  const { commissionId } = use(params);
  const { user } = useAuth();
  const { requests } = useCommissionRequests();
  const request = requests.find((entry) => entry.id === commissionId && entry.assignedDesignerId === user?.userId);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<{ name: string; type: string; size: number; dataUrl?: string }>();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!request) return <div className="py-16 text-center"><p className="font-black">Không tìm thấy commission.</p><Link href="/designer/commissions" className="mt-4 inline-block text-sm font-bold text-[#198653]">Về danh sách</Link></div>;
  const canSubmit = request.designerStatus === "ASSIGNED" || request.designerStatus === "IN_PROGRESS" || request.designerStatus === "CHANGES_REQUESTED";
  if (!canSubmit) return <div className="mx-auto max-w-xl py-16 text-center"><p className="text-xl font-black">Commission chưa thể gửi bản mới</p><p className="mt-2 text-sm text-[#66736b]">Trạng thái hiện tại: {({ ASSIGNED: "Đã phân công", IN_PROGRESS: "Đang thực hiện", SUBMITTED_FOR_REVIEW: "Chờ nhân viên duyệt", CHANGES_REQUESTED: "Cần chỉnh sửa", APPROVED: "Đã duyệt", COMPLETED: "Hoàn tất" } as Record<string, string>)[request.designerStatus ?? ""] ?? request.designerStatus}</p><Link href={`/designer/commissions/${request.id}`} className="mt-5 inline-flex rounded-lg bg-[#198653] px-4 py-2 text-sm font-black text-white">Về không gian làm việc</Link></div>;

  const onFileChange = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.type.startsWith("image/") && selected.type !== "application/zip" && selected.type !== "application/pdf") return setError("Chỉ hỗ trợ ảnh, PDF hoặc ZIP.");
    if (selected.size > 10 * 1024 * 1024) return setError("File không được vượt quá 10MB.");
    const reader = new FileReader();
    reader.onload = () => setFile({ name: selected.name, type: selected.type || "application/octet-stream", size: selected.size, dataUrl: typeof reader.result === "string" && selected.type.startsWith("image/") ? reader.result : undefined });
    reader.onerror = () => setError("Không thể đọc file.");
    reader.readAsDataURL(selected);
    setError("");
  };
  const save = () => { if (!file || !title.trim()) return setError("Vui lòng nhập tiêu đề và chọn file thiết kế."); updateDesignerStatus(request.id, "IN_PROGRESS"); setSaved(true); setError(""); };
  const submit = () => {
    if (!file || !title.trim()) return setError("Vui lòng nhập tiêu đề và chọn file thiết kế.");
    if (!window.confirm("Bạn xác nhận gửi bản thiết kế này cho nhân viên duyệt?")) return;
    submitCommissionDesign(request.id, { id: `SUB-${Date.now().toString(36).toUpperCase()}`, version: (request.submissions?.length ?? 0) + 1, title: title.trim(), file, note: note.trim(), status: "SUBMITTED_FOR_REVIEW", revisionRequestId: request.revisions?.find((revision) => revision.status === "OPEN")?.id, createdAt: new Date().toISOString() });
    setSubmitted(true);
  };

  if (submitted) return <div className="mx-auto max-w-xl py-16 text-center"><CheckCircle2 size={48} className="mx-auto text-[#198653]" /><h1 className="mt-4 text-2xl font-black text-[#173b28]">Đã gửi nhân viên duyệt</h1><p className="mt-2 text-sm text-[#66736b]">Bản thiết kế đã được thêm vào lịch sử bản nộp.</p><Link href={`/designer/commissions/${request.id}`} className="mt-5 inline-flex rounded-lg bg-[#198653] px-4 py-2 text-sm font-black text-white">Về không gian làm việc</Link></div>;

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 pb-8"><Link href={`/designer/commissions/${request.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#155e59]"><ArrowLeft size={15} /> Về không gian làm việc commission</Link><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#198653]">{request.id}</p><h1 className="mt-1 text-2xl font-black text-[#173b28]">{request.submissions?.length ? "Gửi bản chỉnh sửa" : "Tạo bản thiết kế nhân vật"}</h1><p className="mt-1 text-sm text-[#66736b]">File chỉ được chọn và lưu cục bộ (giả lập), chưa tải lên kho lưu trữ đám mây.</p></header><section className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm"><label className="block text-sm font-black">Tiêu đề bản thiết kế<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Ý tưởng nhân vật ban đầu v1" className="mt-2 w-full rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#198653]" /></label><label className="mt-5 block text-sm font-black">File thiết kế<span className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#b7d9be] bg-[#f8fcf8] px-4 py-10 text-center hover:border-[#198653]"><Upload size={26} className="text-[#198653]" /><span className="text-sm">{file ? file.name : "Chọn file thiết kế"}</span><span className="text-xs font-normal text-[#66736b]">Ảnh, PDF hoặc ZIP · tối đa 10MB</span><input type="file" accept="image/*,.pdf,.zip" className="sr-only" onChange={(event) => onFileChange(event.target.files?.[0])} /></span></label>{file?.dataUrl && <img src={file.dataUrl} alt="Xem trước thiết kế" className="mt-4 max-h-72 w-full rounded-xl bg-[#f8fbf8] object-contain" />}<label className="mt-5 block text-sm font-black">Nhật ký thay đổi / ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} maxLength={1500} placeholder="Mô tả những gì đã làm hoặc đã thay đổi..." className="mt-2 w-full resize-y rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#198653]" /></label>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{saved && <p className="mt-4 rounded-lg bg-[#edf7ef] p-3 text-sm font-semibold text-[#155e59]">Đã lưu trạng thái đang thực hiện.</p>}<div className="mt-6 flex flex-col-reverse justify-end gap-2 border-t border-[#e5eee6] pt-5 sm:flex-row"><button type="button" onClick={save} className="rounded-lg border border-[#198653] px-4 py-2.5 text-sm font-black text-[#198653] hover:bg-[#edf7ef]">Lưu bản nháp</button><button type="button" onClick={submit} className="rounded-lg bg-[#198653] px-4 py-2.5 text-sm font-black text-white hover:bg-[#12633f]">Gửi nhân viên duyệt</button></div></section></div>;
}
