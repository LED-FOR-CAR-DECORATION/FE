"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Lock, Mail, User } from "lucide-react";
import { authService, USE_MOCK_AUTH } from "../services/auth.service";
import AuthField from "./AuthField";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Khớp quy tắc backend (swagger RegisterRequest.password):
// 8-72 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt (@$!%*?&).
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,72}$/;

type Message = { text: string; error: boolean } | null;

const initialForm = { fullName: "", email: "", password: "", confirmPassword: "" };

export default function RegisterForm() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  // Bước 2: xác thực email bằng OTP (khi backend yêu cầu)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);

  // Reset lại toàn bộ state (đặc biệt isSuccess = false) mỗi khi mount / unmount trang đăng ký
  // để tránh bị lưu cache trạng thái thành công của phiên trước.
  useEffect(() => {
    const resetState = () => {
      setIsSuccess(false);
      setVerified(false);
      setPendingEmail(null);
      setOtp("");
      setMessage(null);
      setForm(initialForm);
      setIsSubmitting(false);
    };

    resetState();

    return () => {
      resetState();
    };
  }, []);

  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const email = form.email.trim();
    // Backend không nhận họ tên khi đăng ký nên chỉ bắt buộc ở chế độ mock.
    if ((USE_MOCK_AUTH && !form.fullName.trim()) || !emailPattern.test(email)) {
      setMessage({ text: "Vui lòng nhập đúng định dạng email" + (USE_MOCK_AUTH ? " và họ tên." : "."), error: true });
      return;
    }
    if (!passwordPattern.test(form.password)) {
      setMessage({ text: "Mật khẩu cần 8-72 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt (@$!%*?&).", error: true });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage({ text: "Hai mật khẩu không trùng khớp.", error: true });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await authService.register({ ...form, email });
      setForm(initialForm);
      setIsSuccess(true);
      if (result.requiresVerification) {
        setPendingEmail(email);
        setMessage({ text: `Đăng ký thành công! Mã OTP 6 số đã được gửi tới ${email}.`, error: false });
      } else {
        setMessage({ text: "Đăng ký đang được mô phỏng. Chưa có tài khoản thật được tạo cho đến khi backend được kết nối.", error: false });
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage({ text: error instanceof Error ? error.message : "Không thể hoàn tất đăng ký.", error: true });
    } finally { setIsSubmitting(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !pendingEmail) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setMessage({ text: "Mã OTP gồm 6 chữ số.", error: true });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.verifyEmail(pendingEmail, otp);
      setVerified(true);
      setIsSuccess(true);
      setMessage({ text: "Xác thực email thành công! Bạn có thể đăng nhập ngay.", error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Xác thực không thành công.", error: true });
    } finally { setIsSubmitting(false); }
  };

  const resend = async () => {
    if (isSubmitting || !pendingEmail) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.resendVerification(pendingEmail);
      setMessage({ text: `Đã gửi lại mã OTP tới ${pendingEmail}.`, error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Không gửi lại được mã OTP.", error: true });
    } finally { setIsSubmitting(false); }
  };

  const messageBox = message && <p role={message.error ? "alert" : "status"} className={`border-2 px-3 py-2 text-xs font-semibold ${message.error ? "border-red-500 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700"}`}>{message.text}</p>;

  if (pendingEmail && isSuccess) {
    return (
      <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
        {messageBox}
        {verified ? (
          <Link href="/login" className="btn-primary mt-1 w-full py-2.5 text-center uppercase tracking-widest">Đến trang đăng nhập</Link>
        ) : (
          <>
            <AuthField id="reg-otp" label={`Mã OTP gửi tới ${pendingEmail}`} value={otp} onChange={setOtp} placeholder="123456" icon={<KeyRound size={15} />} />
            <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-2.5 uppercase tracking-widest disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Đang xử lý..." : "Xác thực email"}</button>
            <button type="button" onClick={resend} disabled={isSubmitting} className="text-center text-xs font-bold text-text-muted hover:underline disabled:opacity-60">Không nhận được mã? Gửi lại</button>
          </>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {messageBox}
      {USE_MOCK_AUTH && <AuthField id="reg-name" label="Họ tên hiển thị" value={form.fullName} onChange={update("fullName")} placeholder="Nguyễn Văn A" icon={<User size={15} />} />}
      <AuthField id="reg-email" label="Email" value={form.email} onChange={update("email")} placeholder="you@example.com" icon={<Mail size={15} />} />
      <AuthField id="reg-password" label="Mật khẩu" value={form.password} onChange={update("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" icon={<Lock size={15} />}
        action={<button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu" className="text-text-muted">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
      <AuthField id="reg-confirm" label="Xác nhận mật khẩu" value={form.confirmPassword} onChange={update("confirmPassword")} type={showPassword ? "text" : "password"} placeholder="••••••••" icon={<Lock size={15} />} />
      <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-2.5 uppercase tracking-widest disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Đang xử lý..." : "Đăng ký"}</button>
      <p className="text-center text-xs font-medium text-text-muted">Đã có tài khoản? <Link href="/login" className="font-bold text-black hover:underline">Đăng nhập</Link></p>
    </form>
  );
}
