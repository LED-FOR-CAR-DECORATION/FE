import Image from "next/image";
import AuthWindow from "@/components/ui/AuthWindow";
import RegisterForm from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#effaf1] flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="w-full max-w-3xl flex overflow-hidden border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="hidden md:flex w-56 flex-shrink-0 flex-col justify-between bg-black p-6 relative overflow-hidden">
          <h1 className="relative z-10 text-3xl font-black leading-tight uppercase text-white">Join<br />Mirage.</h1>
          <Image src="/auth-hero.png" alt="Retro gaming console" fill sizes="50vw" className="object-cover opacity-60 mix-blend-luminosity" priority />
        </div>
        <div className="flex-1 min-w-0">
          <AuthWindow title="Đăng ký tài khoản">
            <div className="px-8 py-6"><RegisterForm /></div>
          </AuthWindow>
        </div>
      </div>
    </main>
  );
}
