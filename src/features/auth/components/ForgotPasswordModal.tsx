"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  X,
} from "lucide-react";
import { authService } from "../services/auth.service";
import AuthField from "./AuthField";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess?: (email: string) => void;
}

export default function ForgotPasswordModal({
  isOpen,
  initialEmail = "",
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Đồng bộ email ban đầu khi mở modal
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setStep(1);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccessMessage(null);
      setResendCooldown(0);
    }
  }, [isOpen, initialEmail]);

  // Bộ đếm ngược thời gian gửi lại OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Bước 1: Gửi mã OTP về email
  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (!emailPattern.test(trimmedEmail)) {
      setError("Email không đúng định dạng.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(trimmedEmail);
      setStep(2);
      setResendCooldown(60);
      setSuccessMessage("Mã OTP đã được gửi đến email của bạn.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi mã OTP. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại mã OTP ở Bước 2
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await authService.requestPasswordReset(email.trim());
      setResendCooldown(60);
      setSuccessMessage("Đã gửi lại mã OTP mới về email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi lại mã OTP.");
    } finally {
      setIsResending(false);
    }
  };

  // Bước 2: Đổi mật khẩu
  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedOtp = otp.trim();

    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }
    if (!trimmedOtp) {
      setError("Vui lòng nhập mã OTP nhận được từ email.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await authService.resetPassword(email.trim(), trimmedOtp, newPassword);
      setSuccessMessage("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.");
      if (onSuccess) {
        onSuccess(email.trim());
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi mật khẩu không thành công.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-left">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted hover:bg-neutral-100 hover:text-black transition-colors"
          aria-label="Đóng cửa sổ"
        >
          <X size={18} />
        </button>

        {/* Tiêu đề Modal */}
        <div className="border-b border-[#e3efe6] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#dcfce7] shadow-[2px_2px_0px_0px_#000]">
              <KeyRound size={16} className="text-[#165d3a]" />
            </span>
            <div>
              <h3 className="text-lg font-black text-[#173b28] tracking-tight">
                {step === 1 ? "Quên mật khẩu" : "Đặt lại mật khẩu mới"}
              </h3>
              <p className="text-xs font-medium text-text-muted">
                {step === 1
                  ? "Nhập email đã đăng ký để nhận mã OTP khôi phục."
                  : `Mã OTP đã gửi tới ${email}`}
              </p>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs font-medium text-rose-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* BƯỚC 1: NHẬP EMAIL */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-3.5">
            <AuthField
              id="forgot-email"
              label="Địa chỉ email tài khoản"
              type="email"
              value={email}
              onChange={(val) => {
                setEmail(val);
                if (error) setError(null);
              }}
              placeholder="vd: your-email@gmail.com"
              icon={<Mail size={15} />}
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-gradient-to-r from-[#8bd49f] via-primary to-[#7bc08f] py-2.5 text-xs font-black uppercase tracking-wider text-[#10351f] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang gửi mã OTP...</span>
                </>
              ) : (
                <>
                  <span>Gửi mã OTP qua Email</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* BƯỚC 2: NHẬP MẬT KHẨU MỚI & OTP */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            {/* Người dùng có thể nhập trước 2 ô mật khẩu này trong khi chờ mail */}
            <AuthField
              id="new-password"
              label="Mật khẩu mới (tối thiểu 8 ký tự)"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(val) => {
                setNewPassword(val);
                if (error) setError(null);
              }}
              placeholder="Nhập mật khẩu mới"
              icon={<Lock size={15} />}
              required
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-muted hover:text-black p-1 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <AuthField
              id="confirm-new-password"
              label="Nhập lại mật khẩu mới"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(val) => {
                setConfirmPassword(val);
                if (error) setError(null);
              }}
              placeholder="Xác nhận mật khẩu mới"
              icon={<Lock size={15} />}
              required
              action={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-text-muted hover:text-black p-1 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {/* Ô nhập mã OTP */}
            <AuthField
              id="reset-otp"
              label="Mã OTP từ Email"
              type="text"
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (error) setError(null);
              }}
              placeholder="Nhập 6 số (vd: 123456)"
              icon={<KeyRound size={15} />}
              required
            />

            {/* Nút gửi lại OTP */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="flex items-center gap-1 font-bold text-text-muted hover:text-black transition-colors"
              >
                <ArrowLeft size={13} /> Đổi email khác
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending}
                className="flex items-center gap-1 font-bold text-[#165d3a] hover:underline disabled:text-text-muted disabled:no-underline"
              >
                <RefreshCw size={12} className={isResending ? "animate-spin" : ""} />
                {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại mã OTP"}
              </button>
            </div>

            {/* Nút hoàn tất đổi mật khẩu */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-gradient-to-r from-[#8bd49f] via-primary to-[#7bc08f] py-2.5 text-xs font-black uppercase tracking-wider text-[#10351f] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>Thay đổi mật khẩu</span>
                  <CheckCircle2 size={15} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

