"use client";

import "@/lib/api/client";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import { formatPrice } from "@/lib/currency";
import CommissionInbox, { type InboxFilter, type InboxItem } from "./CommissionInbox";

const MAX_PAGES = 5;
const PAGE_SIZE = 50;

/** Bộ lọc của khách — theo việc khách cần làm. */
const CUSTOMER_FILTERS: InboxFilter[] = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "action", label: "Cần bạn phản hồi", statuses: ["PREVIEW_DELIVERED", "AWAITING_EXTRA_PAYMENT"] },
  { key: "design", label: "Đang thiết kế", statuses: ["PAID", "IN_PROGRESS", "INTERNAL_REVIEW", "INTERNAL_REVISION_REQUIRED", "AWAITING_ESTIMATE"] },
  { key: "done", label: "Hoàn thành", statuses: ["COMPLETED"] },
];

async function loadCustomerItems(): Promise<InboxItem[]> {
  const items: InboxItem[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, meta } = await CustomerCommissionsService.listMyCommissions({ page, size: PAGE_SIZE });
    for (const item of data ?? []) {
      if (item.commissionId === undefined || !item.status) continue;
      items.push({
        commissionId: item.commissionId,
        title: item.title || `Commission #${item.commissionId}`,
        status: item.status,
        subtitle: [item.targetMatrixDimensions, typeof item.totalPrice === "number" ? formatPrice(item.totalPrice) : null].filter(Boolean).join(" · "),
      });
    }
    if (!meta?.hasNext) break;
  }
  return items;
}

export default function CustomerInbox() {
  return (
    <CommissionInbox viewer="CUSTOMER" loadItems={loadCustomerItems} filters={CUSTOMER_FILTERS}
      className="h-full"
      emptyText="Chưa có cuộc trò chuyện nào. Phòng chat mở sau khi bạn thanh toán commission." />
  );
}
