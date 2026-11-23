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
      <div className="neo-box-no-hover flex flex-wrap items-center justify-between gap-4 border-l-8 border-l-primary p-4 sm:p-6">
        <h1 id="commission-list-heading" className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Yêu cầu Commission</h1>
        <Link href="/commission/new" className="btn-primary inline-flex min-h-11 items-center text-sm">
          Tạo yêu cầu mới
        </Link>
      </div>
      {isLoading ? (
        <p role="status" className="neo-box-no-hover p-4 text-text-muted">Đang tải yêu cầu…</p>
      ) : userId ? (
        <ServerCommissionRequests key={userId} />
      ) : (
        <p className="neo-box-no-hover p-4 sm:p-5">Đăng nhập bằng tài khoản khách hàng để xem yêu cầu Commission.</p>
      )}
    </section>
  );
}

function ServerCommissionRequests() {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ page: number; items: CustomerCommissionSummaryItem[] }>();
  const [failedPage, setFailedPage] = useState<number>();
  const [retryCount, setRetryCount] = useState(0);
  const [errorTraceId, setErrorTraceId] = useState<string>();
  const size = 20;

  useEffect(() => {
    setFailedPage(undefined);
    setErrorTraceId(undefined);
    let active = true;
    const request = CustomerCommissionsService.listMyCommissions({ page, size });
    request.then(({ data }) => {
      if (active) setResult({ page, items: data ?? [] });
    }).catch((error: unknown) => {
      if (!active) return;
      setFailedPage(page);
      if (error && typeof error === "object" && "body" in error) {
        const body = error.body;
        if (body && typeof body === "object" && "traceId" in body && typeof body.traceId === "string") {
          setErrorTraceId(body.traceId);
        }
      }
    });
    return () => {
      active = false;
      request.cancel();
    };
  }, [page, retryCount]);

  const items = result?.page === page ? result.items : undefined;
  return (
    <div className="space-y-3">
      {failedPage === page ? (
        <div role="alert" className="neo-box-no-hover space-y-3 border-l-8 border-l-red-700 p-4 sm:p-5">
          <p>Không tải được yêu cầu Commission. Vui lòng thử lại.</p>
          {errorTraceId && <p className="break-all text-sm text-gray-600">Mã hỗ trợ: {errorTraceId}</p>}
          <button type="button" onClick={() => {
            setFailedPage(undefined);
            setResult(undefined);
            setRetryCount((count) => count + 1);
          }} className="btn-secondary min-h-11 text-sm">
            Thử lại
          </button>
        </div>
      ) :
        !items ? <p role="status" className="neo-box-no-hover p-4 text-text-muted">Đang tải yêu cầu Commission…</p> :
          items.length === 0 ? <p className="neo-box-no-hover p-4 sm:p-5">Chưa có yêu cầu nào. <Link href="/commission/new" className="cursor-pointer font-bold text-primary-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">Tạo yêu cầu mới</Link></p> : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.commissionId} className="neo-box-no-hover p-4 sm:p-5">
                  <h2 className="break-words text-lg font-black">{item.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-text-muted">{item.targetMatrixDimensions}</span>
                    <span className="break-words border border-black bg-primary/15 px-2 py-0.5 font-bold text-primary-ink">
                      {item.status === "PENDING_REVIEW" ? "Chờ nhân viên duyệt" : item.status}
                    </span>
                  </div>
                  {item.totalPrice !== undefined && <p className="mt-3 font-black tabular-nums text-primary-ink">{formatCommissionMoney(item.totalPrice)}</p>}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-black/30 pt-3">
                    <Link href={`/commission/${item.commissionId}/payment`} className="btn-secondary inline-flex min-h-11 items-center text-sm">
                      {item.status === "PENDING_PAYMENT" || item.status === "AWAITING_EXTRA_PAYMENT" ? "Thanh toán" : "Xem thanh toán"}
                      <span className="sr-only"> cho {item.title}</span>
                    </Link>
                    {canReadHistory(item.status) && (
                      <Link href={`/messages?commissionId=${item.commissionId}`} className="btn-secondary inline-flex min-h-11 items-center text-sm">
                        Mở chat<span className="sr-only"> cho {item.title}</span>
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
      {(page > 0 || items?.length === size) && (
        <nav aria-label="Phân trang yêu cầu Commission" className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary min-h-11 text-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button>
          <button type="button" className="btn-secondary min-h-11 text-sm" disabled={items?.length !== size} onClick={() => setPage(page + 1)}>Trang sau</button>
        </nav>
      )}
    </div>
  );
}
