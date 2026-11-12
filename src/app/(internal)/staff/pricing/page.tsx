import type { Metadata } from "next";
import StoreListingDashboard from "@/features/store-listing/components/StoreListingDashboard";

export const metadata: Metadata = {
  title: "Quản lý Store Listing | PIXEL HUB",
  description: "Duyệt, publish, ẩn và publish lại Character trên Store của PIXEL HUB.",
};

export default function StoreListingPage() {
  return <StoreListingDashboard />;
}
