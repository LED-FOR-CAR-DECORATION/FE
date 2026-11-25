"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Palette,
  ShieldAlert,
  User,
} from "lucide-react";
import { authService } from "../services/auth.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserRole } from "@/features/auth/types";
import AuthField from "./AuthField";
import ForgotPasswordModal from "./ForgotPasswordModal";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("passwordChanged") === "1") {
      setSuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.");
    }
  }, []);


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

      let targetRedirect = roleHome;
      if (redirectTo && redirectTo !== "/") {
        const isStaffArea =
          redirectTo.startsWith("/manager") ||
          redirectTo.startsWith("/staff") ||
          redirectTo.startsWith("/admin") ||
          redirectTo.startsWith("/designer");

        if (user.role === "ADMIN" && (redirectTo.startsWith("/admin") || redirectTo.startsWith("/manager") || redirectTo.startsWith("/staff"))) {
          targetRedirect = redirectTo;
        } else if (user.role === "MANAGER" && (redirectTo.startsWith("/manager") || redirectTo.startsWith("/staff"))) {
          targetRedirect = redirectTo;
        } else if (user.role === "STAFF" && redirectTo.startsWith("/staff")) {
          targetRedirect = redirectTo;
        } else if (user.role === "DESIGNER" && redirectTo.startsWith("/designer")) {
          targetRedirect = redirectTo;
        } else if (user.role === "CUSTOMER" && !isStaffArea) {
          targetRedirect = redirectTo;
        }
      }

      window.setTimeout(() => window.location.assign(targetRedirect), 300);
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
          "Nhập email và mật khẩu đã đăng ký để đăng nhập."
        </p>
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
          }}
          placeholder="vd: tenban@gmail.com"
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
            onClick={() => setIsForgotPasswordOpen(true)}
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

      {/* Modal Quên mật khẩu & Đặt lại mật khẩu */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        initialEmail={email}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword("");
          setSuccess("Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.");
        }}
      />
    </div>
  );
}
