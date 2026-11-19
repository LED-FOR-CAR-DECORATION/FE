"use client";

import { getCommissionQueue, type CommissionQueueItem } from "@/features/commission/services/management-commission.api";
import CommissionInbox, { STAFF_FILTERS, type InboxItem } from "./CommissionInbox";

const MAX_PAGES = 5;

/** Hàng đợi staff → hội thoại; mỗi commission một dòng, tên khách ở dòng phụ. */
async function loadStaffItems(): Promise<InboxItem[]> {
  const items: CommissionQueueItem[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, meta } = await getCommissionQueue(page, false);
    items.push(...data);
    if (!meta?.hasNext) break;
  }
  return items.map((item) => ({
    commissionId: item.commissionId,
    title: item.title,
    status: item.status,
    subtitle: `Khách: ${item.customerName || "Khách hàng"}${item.targetMatrixDimensions ? ` · ${item.targetMatrixDimensions}` : ""}`,
  }));
}

export default function StaffInbox() {
  return (
    <CommissionInbox viewer="STAFF" loadItems={loadStaffItems} filters={STAFF_FILTERS}
      className="h-[calc(100dvh-121px)]"
      emptyText="Chưa có hội thoại nào. Phòng chat mở khi khách thanh toán commission." />
  );
}
