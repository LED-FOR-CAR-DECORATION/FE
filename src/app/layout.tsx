import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LED Windshield Controller",
  description: "Customize your car with beautiful character sprites",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} font-sans antialiased`}>
      <body className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
