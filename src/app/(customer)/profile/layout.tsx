import type { ReactNode } from "react";
import { OrderProvider } from "@/features/order/context/OrderContext";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <OrderProvider>{children}</OrderProvider>;
}
