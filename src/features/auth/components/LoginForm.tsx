"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Palette,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { authService } from "../services/auth.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { DEMO_ACCOUNTS } from "@/features/auth/mock-auth";
import type { UserRole } from "@/features/auth/types";
import AuthField from "./AuthField";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_META: Record<
  UserRole,
  { label: string; badge: string; icon: React.ReactNode; bg: string; border: string }
> = {
  MANAGER: {
    label: "Manager",
    badge: "Quản lý",
    icon: <ShieldCheck size={13} />,
    bg: "bg-emerald-50 text-emerald-800",
    border: "border-emerald-300 hover:border-emerald-600",
  },
  DESIGNER: {
    label: "Designer",
    badge: "Thiết kế",
    icon: <Palette size={13} />,
    bg: "bg-purple-50 text-purple-800",
    border: "border-purple-300 hover:border-purple-600",
  },
  CUSTOMER: {
    label: "Customer",
    badge: "Khách hàng",
    icon: <User size={13} />,
    bg: "bg-blue-50 text-blue-800",
    border: "border-blue-300 hover:border-blue-600",
  },
  STAFF: {
    label: "Staff",
    badge: "Nhân viên",
    icon: <Briefcase size={13} />,
    bg: "bg-amber-50 text-amber-800",
    border: "border-amber-300 hover:border-amber-600",
  },
  ADMIN: {
    label: "Admin",
    badge: "Quản trị",
    icon: <ShieldAlert size={13} />,
    bg: "bg-rose-50 text-rose-800",
    border: "border-rose-300 hover:border-rose-600",
  },
};

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const handleQuickFill = (role: UserRole) => {
    const demo = DEMO_ACCOUNTS.find((item) => item.user.role === role);
    if (!demo) return;
    setEmail(demo.email);
    setPassword(demo.password);
    setSelectedRole(role);
    setErrors({});
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: typeof errors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = "Email không đúng định dạng.";
    }
    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(nextErrors);
    setSuccess("");
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      const user = await authService.login(trimmedEmail, password);
      login(user);
      setSuccess("Đăng nhập thành công! Đang chuyển hướng...");

      const roleHome =
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "MANAGER"
            ? "/manager"
            : user.role === "STAFF"
              ? "/staff"
              : user.role === "DESIGNER"
                ? "/designer/dashboard"
                : "/";
      const requestedRedirect =
        user.role === "CUSTOMER" && redirectTo !== "/manager" ? redirectTo : roleHome;

      window.setTimeout(() => window.location.assign(requestedRedirect), 300);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Đăng nhập không thành công. Vui lòng kiểm tra lại.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome header */}
      <div className="border-b border-[#e3efe6] pb-3 text-left">
        <h2 className="text-xl font-black text-[#173b28] tracking-tight">Đăng nhập tài khoản</h2>
        <p className="mt-0.5 text-xs font-medium text-text-muted">
          Nhập thông tin hoặc chọn tài khoản mẫu bên dưới để thử nghiệm nhanh các vai trò.
        </p>
      </div>

      {/* Quick Account Switcher */}
      <div className="rounded-xl border border-[#d8e6dc] bg-[#f9fcfa] p-3 text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#173b28]">
            <KeyRound size={13} className="text-[#198653]" />
            Đăng nhập nhanh theo vai trò
          </span>
          {selectedRole && (
            <span className="text-[10px] font-bold text-[#198653] flex items-center gap-1 animate-fadeIn">
              <Check size={11} /> Đã điền {ROLE_META[selectedRole].label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {(["MANAGER", "DESIGNER", "CUSTOMER", "STAFF", "ADMIN"] as UserRole[]).map((role) => {
            const meta = ROLE_META[role];
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleQuickFill(role)}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all text-left ${
                  isSelected
                    ? "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                    : `${meta.bg} ${meta.border} hover:-translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.8)]`
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {meta.icon}
                  <span className="truncate">{meta.label}</span>
                </span>
                <span className="text-[9px] font-black uppercase opacity-70 shrink-0">{meta.badge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main form */}
      <form onSubmit={submit} className="flex flex-col gap-3.5 text-left" noValidate>
        {errors.form && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border-2 border-red-500 bg-red-50 p-2.5 text-xs font-bold text-red-800 animate-fadeIn"
          >
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <span>{errors.form}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border-2 border-green-600 bg-green-50 p-2.5 text-xs font-bold text-green-800 animate-fadeIn"
          >
            <Check size={16} className="text-green-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <AuthField
          id="login-email"
          label="Địa chỉ Email"
          value={email}
          onChange={(val) => {
            setEmail(val);
            if (selectedRole) setSelectedRole(null);
          }}
          placeholder="vd: manager123@gmail.com"
          error={errors.email}
          icon={<Mail size={15} />}
          required
        />

        <AuthField
          id="login-password"
          label="Mật khẩu"
          value={password}
          onChange={(val) => {
            setPassword(val);
            if (selectedRole) setSelectedRole(null);
          }}
          type={showPassword ? "text" : "password"}
          placeholder="Nhập mật khẩu..."
          error={errors.password}
          icon={<Lock size={15} />}
          required
          action={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="text-text-muted hover:text-black p-1 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-[#173b28]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-black accent-[#198653] cursor-pointer"
            />
            <span>Ghi nhớ phiên đăng nhập</span>
          </label>
          <button
            type="button"
            onClick={() => {
              if (email.trim()) {
                alert(`Liên kết khôi phục mật khẩu giả lập đã được gửi tới ${email.trim()}`);
              } else {
                alert("Vui lòng nhập email trước khi yêu cầu khôi phục mật khẩu.");
              }
            }}
            className="font-bold text-text-muted hover:text-[#165d3a] hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-gradient-to-r from-[#8bd49f] via-primary to-[#7bc08f] py-3 text-sm font-black uppercase tracking-wider text-[#10351f] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập hệ thống</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Register prompt */}
        <div className="pt-2 text-center text-xs font-medium text-text-muted">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-black text-black hover:text-[#165d3a] hover:underline">
            Đăng ký tài khoản mới →
          </Link>
        </div>
      </form>
    </div>
  );
}
