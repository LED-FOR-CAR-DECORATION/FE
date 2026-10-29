"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { authService } from "../services/auth.service";
import AuthField from "./AuthField";
import { validateRegister, type RegisterErrors } from "../schemas";
import { ApiError } from "@/lib/api/client";

export default function RegisterForm() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const update = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, ...(key === "password" ? { confirmPassword: undefined } : {}) }));
    setMessage(null);
  };
  const validateField = (field: keyof typeof form) => () => {
    const nextErrors = validateRegister(form);
    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const email = form.email.trim();
    const nextErrors = validateRegister(form);
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      const ids: Record<string, string> = { fullName: "reg-name", email: "reg-email", password: "reg-password", confirmPassword: "reg-confirm" };
      document.getElementById(ids[firstField])?.focus();
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.register({ ...form, email });
      setMessage({ text: "Đăng ký thành công! Bạn có thể đăng nhập bằng tài khoản vừa tạo.", error: false });
      setForm({ fullName: "", email: "", password: "", confirmPassword: "" });
    } catch (error) {
      const serverErrors: RegisterErrors = {};
      if (error instanceof ApiError) {
        for (const detail of error.body?.details ?? []) {
          if (typeof detail !== "object" || detail === null) continue;
          const { field, message } = detail as { field?: unknown; message?: unknown };
          if (typeof field === "string" && field in form && typeof message === "string") serverErrors[field as keyof typeof form] = message;
        }
        if (error.body?.code === "EMAIL_ALREADY_REGISTERED") serverErrors.email = "Email này đã được đăng ký.";
      }
      setErrors(serverErrors);
      setMessage({ text: error instanceof Error ? error.message : "Không thể hoàn tất đăng ký. Vui lòng thử lại.", error: true });
    } finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate aria-busy={isSubmitting}>
      {message && <p role={message.error ? "alert" : "status"} className={`border-2 px-3 py-2 text-xs font-semibold ${message.error ? "border-red-500 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700"}`}>{message.text}</p>}
      <AuthField id="reg-name" label="Họ tên hiển thị" value={form.fullName} onChange={update("fullName")} placeholder="Nguyễn Văn A" icon={<User size={15} />} error={errors.fullName} onBlur={validateField("fullName")} maxLength={100} autoComplete="name" disabled={isSubmitting} />
      <AuthField id="reg-email" label="Email" value={form.email} onChange={update("email")} placeholder="you@example.com" icon={<Mail size={15} />} error={errors.email} onBlur={validateField("email")} type="email" maxLength={254} autoComplete="email" disabled={isSubmitting} />
      <AuthField id="reg-password" label="Mật khẩu" value={form.password} onChange={update("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" icon={<Lock size={15} />} error={errors.password} onBlur={validateField("password")} autoComplete="new-password" disabled={isSubmitting}
        action={<button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu" className="text-text-muted">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
      <p className="text-xs text-text-muted">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Không chứa khoảng trắng; tối đa 72 byte UTF-8.</p>
      <AuthField id="reg-confirm" label="Xác nhận mật khẩu" value={form.confirmPassword} onChange={update("confirmPassword")} type={showPassword ? "text" : "password"} placeholder="••••••••" icon={<Lock size={15} />} error={errors.confirmPassword} onBlur={validateField("confirmPassword")} autoComplete="new-password" disabled={isSubmitting} />
      <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-2.5 uppercase tracking-widest disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Đang xử lý..." : "Đăng ký"}</button>
      <p className="text-center text-xs font-medium text-text-muted">Đã có tài khoản? <Link href="/login" className="font-bold text-black hover:underline">Đăng nhập</Link></p>
    </form>
  );
}
