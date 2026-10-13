import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { CartProvider } from "@/features/cart/context/CartContext";
import { AddressProvider } from "@/features/address/context/AddressContext";
import { OrderProvider } from "@/features/order/context/OrderContext";
import { GalleryProvider } from "@/features/character/context/GalleryContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mirage",
  description: "Mirage - bảng LED trang trí và các nhân vật kỹ thuật số cho xe",
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
          <CartProvider><AddressProvider><OrderProvider><GalleryProvider>{children}</GalleryProvider></OrderProvider></AddressProvider></CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
