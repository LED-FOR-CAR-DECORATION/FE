"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, Send, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { validateCommissionSelections } from "@/features/commission/schemas";
import { saveCommissionRequest } from "@/features/commission/services/commission.service";
import { COMMISSION_FIELDS, COMMISSION_OPTIONS, type CommissionFieldKey } from "@/features/commission/types";

const BASE_PRICE = 500000;
const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

export default function CommissionPage() {
  const { user } = useAuth();
  const [selections, setSelections] = useState<Partial<Record<CommissionFieldKey, string>>>({});
  const [note, setNote] = useState("");
  const [referenceImage, setReferenceImage] = useState<{ name: string; dataUrl: string } | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const estimate = useMemo(() => {
    let total = BASE_PRICE;
    let needsQuote = false;
    COMMISSION_FIELDS.forEach(({ key }) => {
      const option = COMMISSION_OPTIONS[key].find((item) => item.value === selections[key]);
      if (option?.surcharge === null) needsQuote = true;
      else if (option) total += option.surcharge;
    });
    return { total, needsQuote };
  }, [selections]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !validateCommissionSelections(selections)) {
      setError("Vui lòng chọn đầy đủ các tùy chọn trước khi gửi.");
      return;
    }
    saveCommissionRequest({
      id: `COM-${Date.now().toString(36).toUpperCase()}`,
      customerId: user.userId,
      customerName: user.fullName,
      customerEmail: user.email,
      selections: selections as Record<CommissionFieldKey, string>,
      note: note.trim(),
      referenceImage,
      estimatedPrice: estimate.needsQuote ? null : estimate.total,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return <><Header /><main className="flex-1 bg-[#f8f7ef] px-4 py-16"><section className="mx-auto max-w-xl rounded-xl border border-[#cfe3d0] bg-white p-10 text-center shadow-sm"><CheckCircle2 className="mx-auto text-[#198653]" size={48} /><h1 className="mt-4 text-2xl font-black text-[#155e59]">Đã gửi yêu cầu thiết kế</h1><p className="mt-3 text-sm text-[#66736b]">Staff sẽ xem xét yêu cầu và liên hệ với bạn để xác nhận báo giá, thời gian hoàn thành.</p><Link href="/" className="mt-7 inline-flex rounded-lg bg-[#155e59] px-5 py-2.5 text-sm font-bold text-white">Về trang cửa hàng</Link></section></main><Footer /></>;
  }

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp hình ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReferenceImage({ name: file.name, dataUrl: reader.result });
        setError("");
      }
    };
    reader.onerror = () => setError("Không thể đọc ảnh. Vui lòng thử lại.");
    reader.readAsDataURL(file);
  };

  return <><Header /><main className="flex-1 bg-[#f8f7ef] px-4 py-8 text-[#26352f]"><div className="mx-auto max-w-5xl"><Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-[#155e59]"><ArrowLeft size={16} /> Về cửa hàng</Link><div className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#155e59]">MIRAGE COMMISSION</p><h1 className="mt-1 text-3xl font-black">Yêu cầu thiết kế nhân vật</h1><p className="mt-2 text-sm text-[#66736b]">Chọn các tùy chọn bên dưới để gửi brief cho đội ngũ thiết kế.</p></div><form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]"><section className="grid gap-4 sm:grid-cols-2">{COMMISSION_FIELDS.map(({ key, label, description }, index) => <label key={key} className="rounded-xl border border-[#e2e4db] bg-white p-4 shadow-sm"><span className="text-xs font-black text-[#155e59]">0{index + 1}. {label}</span><span className="mt-1 block text-xs text-[#66736b]">{description}</span><select required value={selections[key] ?? ""} onChange={(event) => { setSelections((current) => ({ ...current, [key]: event.target.value })); setError(""); }} className="mt-3 w-full rounded-lg border border-[#d4ddd5] bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#155e59]"><option value="">Chọn một tùy chọn</option>{COMMISSION_OPTIONS[key].map((option) => <option key={option.value} value={option.value}>{option.label}{option.surcharge === null ? " — báo giá sau" : option.surcharge > 0 ? ` (+${formatMoney(option.surcharge)})` : ""}</option>)}</select></label>)}<label className="rounded-xl border border-[#e2e4db] bg-white p-4 shadow-sm sm:col-span-2"><span className="text-xs font-black text-[#155e59]">Ảnh tham khảo <span className="font-normal text-[#7a8c80]">(không bắt buộc)</span></span><span className="mt-1 block text-xs text-[#66736b]">Tải lên tối đa 1 ảnh JPG, PNG hoặc WEBP, dung lượng không quá 5MB.</span>{referenceImage ? <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#cfe3d0] bg-[#f6fbf7] p-2"><img src={referenceImage.dataUrl} alt="Ảnh tham khảo đã chọn" className="h-16 w-16 rounded-md object-cover" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{referenceImage.name}</span><button type="button" onClick={() => setReferenceImage(undefined)} aria-label="Xóa ảnh tham khảo" className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><X size={16} /></button></div> : <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#b7d9be] bg-[#f8fcf8] px-4 py-6 text-center transition hover:border-[#198653] hover:bg-[#edf7ef]"><ImagePlus size={25} className="text-[#198653]" /><span className="text-sm font-bold text-[#155e59]">Chọn ảnh tham khảo</span><span className="text-[11px] text-[#7a8c80]">JPG, PNG, WEBP · tối đa 5MB</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleImageChange(event.target.files?.[0])} /></label>}</label><label className="rounded-xl border border-[#e2e4db] bg-white p-4 shadow-sm sm:col-span-2"><span className="text-xs font-black text-[#155e59]">Ghi chú cho designer</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1000} placeholder="Mô tả thêm ý tưởng, màu sắc, deadline hoặc tài liệu tham khảo..." className="mt-3 w-full resize-y rounded-lg border border-[#d4ddd5] px-3 py-2.5 text-sm outline-none focus:border-[#155e59]" /></label></section><aside className="h-fit rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] p-5 lg:sticky lg:top-24"><h2 className="text-lg font-black text-[#155e59]">Tóm tắt báo giá</h2><div className="mt-5 flex items-center justify-between border-b border-[#cfe3d0] pb-3 text-sm"><span>Giá cơ bản</span><strong>{formatMoney(BASE_PRICE)}</strong></div><div className="mt-3 flex items-center justify-between text-sm"><span>Phụ phí tùy chọn</span><strong>{formatMoney(estimate.total - BASE_PRICE)}</strong></div><div className="mt-4 border-t border-[#cfe3d0] pt-4"><p className="text-xs text-[#66736b]">Dự kiến từ</p><p className="mt-1 text-2xl font-black text-[#155e59]">{estimate.needsQuote ? "Báo giá sau" : formatMoney(estimate.total)}</p></div>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}<button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#155e59] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0e4b47]"><Send size={16} /> Gửi yêu cầu</button><p className="mt-3 text-center text-[11px] text-[#66736b]">Báo giá cuối cùng sẽ được staff xác nhận.</p></aside></form></div></main><Footer /></>;
}
