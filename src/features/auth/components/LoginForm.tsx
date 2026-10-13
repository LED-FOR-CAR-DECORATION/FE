"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { authService } from "../services/auth.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import AuthField from "./AuthField";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors: typeof errors = {};
    const trimmedEmail = email.trim();
    if (!emailPattern.test(trimmedEmail)) nextErrors.email = "Vui lòng nhập email hợp lệ.";
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    setErrors(nextErrors);
    setSuccess("");
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      const user = await authService.login(trimmedEmail, password);
      login(user);
      setSuccess("Đăng nhập thành công. Đang chuyển hướng...");
      const roleHome = user.role === "ADMIN" ? "/admin" : user.role === "MANAGER" ? "/manager" : user.role === "STAFF" ? "/staff" : "/";
      const requestedRedirect = user.role === "CUSTOMER" && redirectTo !== "/manager" ? redirectTo : roleHome;
      window.setTimeout(() => window.location.assign(requestedRedirect), 350);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Đăng nhập không thành công." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {errors.form && <p role="alert" className="border-2 border-red-500 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{errors.form}</p>}
      {success && <p role="status" className="border-2 border-green-600 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{success}</p>}
      <AuthField id="login-email" label="Email" value={email} onChange={setEmail} placeholder="customer123@gmail.com" error={errors.email} icon={<Mail size={15} />} />
      <AuthField id="login-password" label="Mật khẩu" value={password} onChange={setPassword} type={showPassword ? "text" : "password"} placeholder="••••••••" error={errors.password} icon={<Lock size={15} />}
        action={<button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="text-text-muted">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
      <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-2.5 uppercase tracking-widest disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="text-center text-xs font-medium text-text-muted">Chưa có tài khoản? <Link href="/register" className="font-bold text-black hover:underline">Đăng ký ngay!</Link></p>
      <div className="border-t border-primary-light pt-3 text-center text-[11px] text-text-muted">
        <p>Customer: <strong>customer123@gmail.com</strong> / <strong>Customer123@</strong></p>
        <p>Manager: <strong>manager123@gmail.com</strong> / <strong>Manager123@</strong></p>
        <p>Staff: <strong>staff123@gmail.com</strong> / <strong>Staff123@</strong></p>
        <p>Admin: <strong>admin123@gmail.com</strong> / <strong>Admin123@</strong></p>
      </div>
    </form>
  );
}
