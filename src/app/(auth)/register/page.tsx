"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, RefreshCw } from "lucide-react";
import AuthWindow from "@/components/ui/AuthWindow";

/* Google SVG icon */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* Social strip shared by both steps */
function SocialStrip({ label }: { label: string }) {
  return (
    <div className="bg-primary border-t-2 border-black px-6 py-3 flex items-center gap-4">
      <span className="text-sm font-bold text-black whitespace-nowrap">{label}</span>
      {/* Google */}
      <button
        type="button"
        onClick={() => {/* TODO: trigger Google OAuth signup */}}
        className="w-9 h-9 rounded-full bg-white border-2 border-black flex items-center justify-center hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow"
        aria-label="Sign up with Google"
      >
        <GoogleIcon />
      </button>
      {[2, 3, 4].map((i) => (
        <button
          key={i}
          type="button"
          className="w-9 h-9 rounded-full bg-white border-2 border-black flex items-center justify-center hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow opacity-30 cursor-not-allowed"
          aria-label={`Social ${i}`}
          disabled
        >
          <div className="w-4 h-4 rounded-full bg-gray-300" />
        </button>
      ))}
    </div>
  );
}

/* ── Step 1: Sign-up form ── */
function SignUpForm({ onNext }: { onNext: () => void }) {
  const [remember, setRemember] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <AuthWindow title="Đăng ký tài khoản">
      <div className="px-8 py-6">
        <form className="flex flex-col gap-4">
          {/* Email / Phone */}
          <div>
            <label htmlFor="reg-email" className="block text-sm font-bold mb-1">
              Email/Số điện thoại
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                <User size={15} />
              </span>
              <input
                id="reg-email"
                type="text"
                placeholder="customer@example.com"
                className="w-full bg-gray-100 border-2 border-black py-2 pl-9 pr-3 outline-none focus:bg-white transition-colors text-sm font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="block text-sm font-bold mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                <Lock size={15} />
              </span>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                className="w-full bg-gray-100 border-2 border-black py-2 pl-9 pr-3 outline-none focus:bg-white transition-colors text-sm font-medium"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="reg-confirm" className="block text-sm font-bold mb-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                <Lock size={15} />
              </span>
              <input
                id="reg-confirm"
                type="password"
                placeholder="••••••••"
                className="w-full bg-gray-100 border-2 border-black py-2 pl-9 pr-3 outline-none focus:bg-white transition-colors text-sm font-medium"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 border-2 border-black accent-primary"
              />
              Ghi nhớ đăng nhập
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 border-2 border-black accent-primary"
              />
              Tôi đã đọc và đồng ý với{" "}
              <Link href="#" className="font-bold hover:underline text-black">
                Điều khoản dịch vụ
              </Link>
            </label>
          </div>

          {/* Sign-up button */}
          <button
            type="button"
            onClick={onNext}
            className="self-end px-8 py-2.5 bg-primary border-2 border-black font-black uppercase tracking-widest text-sm text-black transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
          >
            Đăng ký
          </button>
        </form>
      </div>

      <SocialStrip label="Đăng ký bằng" />
    </AuthWindow>
  );
}

/* ── Step 2: Auth code verification ── */
function AuthCodeForm({ onBack }: { onBack: () => void }) {
  return (
    <AuthWindow title="Xác thực tài khoản">
      <div className="px-8 py-6">
        <form className="flex flex-col gap-4">
          {/* Authcode */}
          <div>
            <label htmlFor="reg-authcode" className="block text-sm font-bold mb-1">
              Mã xác thực
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                <User size={15} />
              </span>
              <input
                id="reg-authcode"
                type="text"
                placeholder="Nhập mã được gửi đến email của bạn"
                className="w-full bg-gray-100 border-2 border-black py-2 pl-9 pr-3 outline-none focus:bg-white transition-colors text-sm font-medium"
              />
            </div>
          </div>

          {/* Resend + Sign up */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-black transition-colors"
            >
              <RefreshCw size={13} />
              Gửi lại mã
            </button>
            <button
              type="button"
              className="px-8 py-2.5 bg-primary border-2 border-black font-black uppercase tracking-widest text-sm text-black transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
            >
              Đăng ký
            </button>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-text-muted hover:underline self-start"
          >
            ← Quay lại
          </button>
        </form>
      </div>

      <SocialStrip label="Đăng ký bằng" />
    </AuthWindow>
  );
}

/* ── Page ── */
export default function RegisterPage() {
  const [step, setStep] = useState<"signup" | "auth">("signup");

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl flex shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black">

        {/* Left decorative panel */}
        <div className="hidden md:flex flex-col justify-between bg-black w-56 flex-shrink-0 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-white font-black text-3xl leading-tight uppercase">
              Join our<br />community<br />TODAY.
            </h2>
          </div>
          <div className="absolute inset-0">
            <Image
              src="/auth-hero.png"
              alt="Retro gaming console"
              fill
              className="object-cover opacity-60 mix-blend-luminosity"
            />
          </div>
          {/* Bottom link */}
          <div className="relative z-10">
            <Link
              href="/login"
              className="text-xs font-bold text-white/70 hover:text-white hover:underline"
            >
              Already have an account? →
            </Link>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex flex-col">
          {step === "signup" ? (
            <SignUpForm onNext={() => setStep("auth")} />
          ) : (
            <AuthCodeForm onBack={() => setStep("signup")} />
          )}
        </div>
      </div>
    </main>
  );
}
