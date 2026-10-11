"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { authService } from "../services/auth.service";
import AuthField from "./AuthField";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterForm() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const email = form.email.trim();
    if (!form.fullName.trim() || !emailPattern.test(email) || !form.password || form.password !== form.confirmPassword) {
      setMessage({ text: "Vui lòng kiểm tra họ tên, email và đảm bảo hai mật khẩu trùng khớp.", error: true });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.register({ ...form, email });
      setMessage({ text: "Đăng ký đang được mô phỏng. Chưa có tài khoản thật được tạo cho đến khi backend được kết nối.", error: false });
      setForm({ fullName: "", email: "", password: "", confirmPassword: "" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Không thể hoàn tất đăng ký mô phỏng.", error: true });
    } finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {message && <p role={message.error ? "alert" : "status"} className={`border-2 px-3 py-2 text-xs font-semibold ${message.error ? "border-red-500 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700"}`}>{message.text}</p>}
      <AuthField id="reg-name" label="Họ và tên" value={form.fullName} onChange={update("fullName")} placeholder="Nguyễn Văn A" icon={<User size={15} />} />
      <AuthField id="reg-email" label="Email" value={form.email} onChange={update("email")} placeholder="you@example.com" icon={<Mail size={15} />} />
      <AuthField id="reg-password" label="Mật khẩu" value={form.password} onChange={update("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" icon={<Lock size={15} />}
        action={<button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu" className="text-text-muted">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
      <AuthField id="reg-confirm" label="Xác nhận mật khẩu" value={form.confirmPassword} onChange={update("confirmPassword")} type={showPassword ? "text" : "password"} placeholder="••••••••" icon={<Lock size={15} />} />
      <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-2.5 uppercase tracking-widest disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Đang xử lý..." : "Đăng ký"}</button>
      <p className="text-center text-xs font-medium text-text-muted">Đã có tài khoản? <Link href="/login" className="font-bold text-black hover:underline">Đăng nhập</Link></p>
    </form>
  );
}
