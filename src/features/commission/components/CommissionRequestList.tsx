"use client";

import "@/lib/api/client";
import { CustomerCommissionsService } from "@/api_client/services/CustomerCommissionsService";
import type { CustomerCommissionSummaryItem } from "@/api_client/models/CustomerCommissionSummaryItem";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCommissionMoney } from "../config/fixedPricing";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";

export default function CommissionRequestList() {
  const { user, isLoading } = useAuth();
  const userId = user?.role === "CUSTOMER" ? user.userId : undefined;

  return (
    <section aria-labelledby="commission-list-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="commission-list-heading" className="text-3xl font-black text-[#155e59]">Yêu cầu Commission</h1>
        <Link href="/commission/new" className="rounded-lg bg-[#155e59] px-4 py-3 font-semibold text-white hover:bg-[#0e4b47]">
          Tạo yêu cầu mới
        </Link>
      </div>
      {isLoading ? (
        <p role="status">Đang tải yêu cầu…</p>
      ) : userId ? (
        <ServerCommissionRequests key={userId} />
      ) : (
        <p className="rounded-xl border border-[#cfe3d0] bg-white p-5">Đăng nhập bằng tài khoản khách hàng để xem yêu cầu Commission.</p>
      )}
    </section>
  );
}

function ServerCommissionRequests() {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ page: number; items: CustomerCommissionSummaryItem[] }>();
  const [failedPage, setFailedPage] = useState<number>();
  const size = 20;

  useEffect(() => {
    setFailedPage(undefined);
    let active = true;
    const request = CustomerCommissionsService.listMyCommissions({ page, size });
    request.then(({ data }) => {
      if (active) setResult({ page, items: data ?? [] });
    }).catch(() => {
      if (active) setFailedPage(page);
    });
    return () => {
      active = false;
      request.cancel();
    };
  }, [page]);

  const items = result?.page === page ? result.items : undefined;
  return (
    <div className="space-y-3">
      {failedPage === page ? <p role="alert">Không tải được yêu cầu Commission.</p> :
        !items ? <p role="status">Đang tải yêu cầu Commission…</p> :
          items.length === 0 ? <p className="rounded-xl border border-[#cfe3d0] bg-white p-5">Chưa có yêu cầu nào. <Link href="/commission/new" className="font-semibold text-[#155e59] underline">Tạo yêu cầu mới</Link></p> : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.commissionId} className="rounded-xl border border-[#cfe3d0] bg-white p-5">
                  <h2 className="font-bold text-[#155e59]">{item.title}</h2>
                  <p className="text-sm">{item.targetMatrixDimensions} · {item.status === "PENDING_REVIEW" ? "Chờ nhân viên duyệt" : item.status}</p>
                  {item.totalPrice !== undefined && <p className="text-sm">{formatCommissionMoney(item.totalPrice)}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-5">
                    <Link href={`/commission/${item.commissionId}/payment`} className="inline-flex min-h-11 items-center font-semibold text-[#155e59] underline">
                      {item.status === "PENDING_PAYMENT" || item.status === "AWAITING_EXTRA_PAYMENT" ? "Thanh toán" : "Xem thanh toán"}
                      <span className="sr-only"> cho {item.title}</span>
                    </Link>
                    {canReadHistory(item.status) && (
                      <Link href={`/messages?commissionId=${item.commissionId}`} className="inline-flex min-h-11 items-center font-semibold text-[#155e59] underline">
                        Mở chat<span className="sr-only"> cho {item.title}</span>
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
      {(page > 0 || items?.length === size) && (
        <div className="flex gap-4">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button>
          <button type="button" disabled={items?.length !== size} onClick={() => setPage(page + 1)}>Trang sau</button>
        </div>
      )}
    </div>
  );
}
