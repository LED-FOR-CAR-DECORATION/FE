"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Lock, X } from "lucide-react";
import { clearSession, clearTokens } from "@/lib/auth/session";
import { authService } from "../services/auth.service";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,72}$/;
const passwordHint =
  "8–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&); không có khoảng trắng.";
const inputClass =
  "mt-2 w-full rounded-lg border border-[#cbd7d0] px-4 py-3 text-sm outline-none focus:border-[#28664f] focus:ring-2 focus:ring-[#b8d9c8]";

export default function ChangePasswordModal({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const busy = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const otpInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (step === 2) otpInput.current?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  const requestOtp = async () => {
    if (busy.current || cooldown > 0) return;
    if (!email.trim()) {
      setMessage({
        text: "Không tìm thấy email tài khoản. Vui lòng đăng nhập lại.",
        error: true,
      });
      return;
    }
    busy.current = true;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.requestPasswordReset(email);
      setStep(2);
      setOtp("");
      setCooldown(60);
      setMessage({
        text: "Yêu cầu gửi mã OTP đã được tiếp nhận. Vui lòng kiểm tra email của bạn.",
        error: false,
      });
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Không thể gửi mã OTP. Vui lòng thử lại.",
        error: true,
      });
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  };

  const updatePassword = async () => {
    if (busy.current) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setMessage({ text: "Vui lòng nhập mã OTP gồm 6 chữ số.", error: true });
      otpInput.current?.focus();
      return;
    }
    if (!passwordPattern.test(newPassword)) {
      setMessage({ text: `Mật khẩu mới phải có ${passwordHint}`, error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Mật khẩu xác nhận không trùng khớp.", error: true });
      return;
    }
    busy.current = true;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.resetPassword(email, otp, newPassword);
    } catch (error) {
      busy.current = false;
      setIsSubmitting(false);
      setMessage({
        text:
          error instanceof Error ? error.message : "Không thể đổi mật khẩu.",
        error: true,
      });
      return;
    }
    // Password reset revokes all backend sessions; reload to reset the auth provider too.
    clearTokens();
    clearSession();
    window.location.replace("/login?passwordChanged=1");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-change-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 outline-none"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy.current) onClose();
        if (event.key !== "Tab") return;
        const focusable = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), [href]",
        );
        if (!focusable?.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dbe3de] bg-[#f8f7f1] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between border-b border-[#dbe3de] pb-4">
          <div>
            <h3
              id="password-change-title"
              className="text-xl font-black text-[#244638]"
            >
              Đổi mật khẩu
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Xác nhận bằng mã OTP gửi đến email tài khoản của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#52675c] hover:bg-white disabled:opacity-50"
            aria-label="Đóng cửa sổ đổi mật khẩu"
          >
            <X size={20} />
          </button>
        </div>

        <ol
          className="mt-5 grid grid-cols-2 gap-2 text-xs font-semibold text-text-muted"
          aria-label="Tiến trình đổi mật khẩu"
        >
          {["Gửi mã OTP", "Đặt mật khẩu mới"].map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? "step" : undefined}
            >
              <div
                className={`mb-3 h-1.5 rounded-full ${index + 1 <= step ? "bg-[#28664f]" : "bg-[#d4ded8]"}`}
              />
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        <form
          className="mt-6 rounded-2xl border border-[#dbe3de] bg-white p-5"
          aria-busy={isSubmitting}
          onSubmit={(event) => {
            event.preventDefault();
            void (step === 1 ? requestOtp() : updatePassword());
          }}
        >
          <h4 className="text-lg font-black text-[#294b3d]">
            {step === 1 ? "Xác minh email" : "Mã OTP và mật khẩu mới"}
          </h4>
          <p className="mt-2 break-words text-sm text-text-muted">
            {step === 1
              ? `Mã xác minh sẽ được gửi đến ${email}.`
              : `Nhập mã OTP gồm 6 chữ số được gửi đến ${email}. Mã có hiệu lực trong 5 phút.`}
          </p>
          {message && (
            <p
              role={message.error ? "alert" : "status"}
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${message.error ? "border-red-400 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700"}`}
            >
              {message.text}
            </p>
          )}
          {step === 2 && (
            <fieldset
              disabled={isSubmitting}
              className="mt-5 min-w-0 space-y-4"
            >
              <label
                className="block text-sm font-bold text-[#294b3d]"
                htmlFor="change-password-otp"
              >
                Mã OTP
                <input
                  ref={otpInput}
                  id="change-password-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
                  }
                  className={`${inputClass} tracking-[0.35em]`}
                  placeholder="000000"
                  required
                />
              </label>
              <label
                className="block text-sm font-bold text-[#294b3d]"
                htmlFor="change-password-new"
              >
                Mật khẩu mới
                <span className="relative block">
                  <input
                    id="change-password-new"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-describedby="change-password-policy"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={`${inputClass} pr-14`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 mt-2 flex w-12 items-center justify-center text-[#52675c]"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
              </label>
              <p
                id="change-password-policy"
                className="text-xs text-text-muted"
              >
                {passwordHint}
              </p>
              <label
                className="block text-sm font-bold text-[#294b3d]"
                htmlFor="change-password-confirm"
              >
                Xác nhận mật khẩu mới
                <input
                  id="change-password-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                  required
                />
              </label>
            </fieldset>
          )}
          <button
            type="submit"
            disabled={isSubmitting || (step === 1 && !email.trim())}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#28664f] px-4 py-3 font-black text-white transition-colors hover:bg-[#1e513e] disabled:cursor-wait disabled:opacity-60"
          >
            <Lock size={17} />
            {isSubmitting
              ? "Đang xử lý..."
              : step === 1
                ? "Gửi mã OTP"
                : "Cập nhật mật khẩu"}
          </button>
          {step === 2 && (
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={isSubmitting || cooldown > 0}
              className="mt-3 min-h-11 w-full text-center text-sm font-bold text-[#28664f] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-text-muted">
            Sau khi đổi mật khẩu thành công, bạn cần đăng nhập lại.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
