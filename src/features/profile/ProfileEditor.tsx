"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserRound, Save } from "lucide-react";

export default function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "").trim();
    const phoneNumber = String(data.get("phoneNumber") ?? "").trim();
    const dateOfBirth = String(data.get("dateOfBirth") ?? "");
    if (fullName.length < 2 || (phoneNumber && !/^\+?[\d\s()-]{9,16}$/.test(phoneNumber))) { setMessage("Kiểm tra họ tên và số điện thoại."); return; }
    updateProfile({ fullName, phoneNumber, dateOfBirth }); setMessage("Đã cập nhật hồ sơ trên trình duyệt này.");
  }
  return <section className="mx-auto w-full max-w-2xl rounded-xl border border-green-200 bg-white p-6 md:p-8"><div className="mb-6 flex items-center gap-3"><span className="rounded-lg bg-primary/20 p-3"><UserRound size={25} /></span><div><h1 className="text-2xl font-black">Thông tin tài khoản</h1><p className="text-sm text-text-muted">Cập nhật thông tin cá nhân của bạn.</p></div></div><form key={user?.userId} onSubmit={submit} className="space-y-5"><label className="block text-sm font-bold">Họ và tên<input name="fullName" required minLength={2} maxLength={100} defaultValue={user?.fullName} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5" /></label><label className="block text-sm font-bold">Email<input type="email" readOnly value={user?.email ?? ""} className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-500" /></label><label className="block text-sm font-bold">Số điện thoại<input name="phoneNumber" type="tel" defaultValue={user?.phoneNumber} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5" /></label><label className="block text-sm font-bold">Ngày sinh<input name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={user?.dateOfBirth} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5" /></label>{message && <p role="status" className="text-sm font-semibold text-green-800">{message}</p>}<button className="btn-primary flex items-center gap-2"><Save size={16} />Lưu thông tin</button></form></section>;
}
