import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { CartProvider } from "@/features/cart/context/CartContext";
import { AddressProvider } from "@/features/address/context/AddressContext";
import { GalleryProvider } from "@/features/character/context/GalleryContext";
import QueryProvider from "@/lib/query/QueryProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumintra",
  description: "Lumintra - bảng LED trang trí và các nhân vật kỹ thuật số cho xe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
      <body suppressHydrationWarning className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
        <QueryProvider>
          <AuthProvider>
            <CartProvider><AddressProvider><GalleryProvider>{children}</GalleryProvider></AddressProvider></CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
