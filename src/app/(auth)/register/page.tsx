import Image from "next/image";
import AuthWindow from "@/components/ui/AuthWindow";
import RegisterForm from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex bg-[#effaf1]">
      <section className="hidden md:block relative w-1/2 border-r-2 border-black bg-black overflow-hidden">
        <Image src="/images/auth/reg.png" alt="Banner pixel art" fill sizes="50vw" className="object-cover" style={{ imageRendering: "pixelated" }} priority />
      </section>
      <section className="w-full md:w-1/2 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <AuthWindow title="Đăng ký tài khoản">
            <div className="px-8 py-6"><RegisterForm /></div>
          </AuthWindow>
        </div>
      </section>
    </main>
  );
}
