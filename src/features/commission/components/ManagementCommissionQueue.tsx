"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/currency";
import { getApiErrorMessage } from "@/lib/api/auth";
import {
  approveCommission, assignCommissionDesigner, getCommissionQueue, getManagementCommission, listCommissionDesigners,
  type CommissionManagementDetail, type CommissionQueueItem, type DesignerOption,
} from "../services/management-commission.api";
import { commissionButton } from "./FixedCommissionSteps";
import StaffDraftReview from "./StaffDraftReview";
import Link from "next/link";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";

const labels: Record<string, string> = {
  PENDING_REVIEW: "Chờ duyệt", PENDING_PAYMENT: "Chờ thanh toán", PAID: "Đã thanh toán · Chờ phân công",
  IN_PROGRESS: "Đang thiết kế", INTERNAL_REVIEW: "Chờ duyệt bản thiết kế", INTERNAL_REVISION_REQUIRED: "Cần chỉnh sửa",
  PREVIEW_DELIVERED: "Đã gửi bản xem trước", AWAITING_EXTRA_PAYMENT: "Chờ thanh toán bổ sung",
  CUSTOMER_REVISION_REQUESTED: "Khách yêu cầu chỉnh sửa", AWAITING_ESTIMATE: "Chờ báo giá",
  COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn",
};
const panel = "space-y-3 rounded-xl border border-[#cfe3d0] bg-white p-5";
/** Giải thích vì sao trạng thái hiện tại không có nút thao tác cho staff. */
const idleHints: Record<string, string> = {
  PENDING_PAYMENT: "Đang chờ khách thanh toán. Khi khách thanh toán xong, nút phân công designer sẽ hiện ở đây.",
  AWAITING_EXTRA_PAYMENT: "Đang chờ khách thanh toán phí chỉnh sửa bổ sung.",
  IN_PROGRESS: "Designer đang thực hiện. Khi designer nộp bản nháp, phần duyệt bản nháp sẽ hiện ở đây.",
  INTERNAL_REVISION_REQUIRED: "Đã trả bản nháp về designer, đang chờ bản sửa.",
  PREVIEW_DELIVERED: "Đã gửi bản xem trước, đang chờ khách phản hồi. Nếu khách muốn sửa, mở phòng chat để gửi thẻ yêu cầu chỉnh sửa.",
  CUSTOMER_REVISION_REQUESTED: "Khách đã xác nhận yêu cầu chỉnh sửa. Đang chờ designer nộp bản sửa.",
  COMPLETED: "Commission đã hoàn thành.",
  CANCELLED: "Commission đã bị hủy.",
  EXPIRED: "Commission đã hết hạn thanh toán.",
};

export default function ManagementCommissionQueue({ assigned = false }: { assigned?: boolean }) {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ page: number; items: CommissionQueueItem[]; hasNext: boolean }>();
  const [selected, setSelected] = useState<number>();
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    let query: ReturnType<typeof getCommissionQueue>;
    function load() {
      query = getCommissionQueue(page, assigned);
      query.then(({ data, meta }) => {
        if (closed) return;
        setResult({ page, items: data, hasNext: Boolean(meta?.hasNext) });
        setError("");
      }).catch((failure) => {
        if (!closed) setError(getApiErrorMessage(failure, "Không tải được danh sách Commission."));
      }).finally(() => {
        if (!closed) timer = setTimeout(load, 10000);
      });
    }
    load();
    return () => {
      closed = true;
      clearTimeout(timer);
      query?.cancel();
    };
  }, [assigned, page, revision]);

  const current = result?.page === page ? result : undefined;
  const item = current?.items.find(({ commissionId }) => commissionId === selected);

  function changePage(next: number) {
    setSelected(undefined);
    setError("");
    setPage(next);
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-8 text-[#26352f]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-[#155e59]">
          {assigned ? "Commission được phân công" : "Quản lý yêu cầu thiết kế nhân vật"}
        </h1>
        <button type="button" className="min-h-11 font-semibold text-[#155e59] underline" onClick={() => refresh((value) => value + 1)}>Làm mới</button>
      </header>
      {error && <p role="alert">{error}</p>}
      {!current && !error && <p role="status">Đang tải yêu cầu…</p>}
      {current?.items.length === 0 && <p className={panel}>Chưa có yêu cầu trên trang này.</p>}
      {current && current.items.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ul className="space-y-2">
            {current.items.map((row) => (
              <li key={row.commissionId} className="rounded-xl border border-[#cfe3d0] bg-white">
                <button type="button" aria-pressed={row.commissionId === selected}
                  className="block w-full rounded-xl p-4 text-left hover:bg-[#f4f8f3] aria-pressed:bg-[#eaf5e8]"
                  onClick={() => setSelected(row.commissionId)}>
                  <strong className="block break-words text-[#155e59]">#{row.commissionId} · {row.title}</strong>
                  <span className="block text-sm">{labels[row.status] ?? row.status}{row.customerName && ` · ${row.customerName}`}</span>
                  {row.assignedDesignerName && !assigned && <span className="block text-sm">Designer: {row.assignedDesignerName}</span>}
                </button>
              </li>
            ))}
          </ul>
          {item && <CommissionDetails key={item.commissionId} item={item} assigned={assigned} onChange={() => refresh((value) => value + 1)} />}
        </div>
      )}
      {(page > 0 || current?.hasNext) && (
        <div className="flex gap-4">
          <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>Trang trước</button>
          <button type="button" disabled={!current?.hasNext} onClick={() => changePage(page + 1)}>Trang sau</button>
        </div>
      )}
    </section>
  );
}

function CommissionDetails({ item, assigned, onChange }: {
  item: CommissionQueueItem; assigned: boolean; onChange: () => void;
}) {
  const [detail, setDetail] = useState<CommissionManagementDetail>();
  const [designers, setDesigners] = useState<DesignerOption[]>();
  const [designersFailed, setDesignersFailed] = useState(false);
  const [designerId, setDesignerId] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, reload] = useState(0);
  const { commissionId, status } = item;

  useEffect(() => {
    let active = true;
    const query = getManagementCommission(commissionId);
    query.then(({ data }) => { if (active) setDetail(data); }).catch((failure) => {
      if (active) setError(getApiErrorMessage(failure, "Không tải được brief."));
    });
    return () => { active = false; query.cancel(); };
  }, [commissionId, revision, status]);

  useEffect(() => {
    if (assigned || status !== "PAID") return;
    let active = true;
    const query = listCommissionDesigners();
    query.then(({ data }) => {
      if (!active) return;
      setDesigners(data);
      setDesignersFailed(false);
    }).catch((failure) => {
      if (!active) return;
      setDesignersFailed(true);
      setError(getApiErrorMessage(failure, "Không tải được danh sách designer."));
    });
    return () => { active = false; query.cancel(); };
  }, [assigned, revision, status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || assigned) return;
    if (status !== "PENDING_REVIEW" && (status !== "PAID" || !designerId)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (status === "PENDING_REVIEW") {
        await approveCommission(commissionId);
        setNotice("Đã mở thanh toán cho khách.");
      } else {
        await assignCommissionDesigner(commissionId, Number(designerId));
        setNotice("Đã phân công designer.");
      }
      onChange();
      reload((value) => value + 1);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Không xử lý được yêu cầu."));
      onChange();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const displayStatus = detail?.status ?? status;
  return (
    <div className={panel}>
      <h2 className="break-words text-lg font-bold text-[#155e59]">{item.title}</h2>
      <p className="text-sm">{labels[displayStatus] ?? displayStatus}</p>
      {item.targetMatrixDimensions && <p>{item.targetMatrixDimensions}</p>}
      {typeof item.totalPrice === "number" && <p className="font-semibold">{formatPrice(item.totalPrice)}</p>}
      {item.assignedStaffName && <p className="text-sm">Staff phụ trách: {item.assignedStaffName}</p>}
      {detail?.description && <p className="whitespace-pre-wrap break-words">{detail.description}</p>}
      {detail?.attachments?.map(({ attachmentId, imageUrl, caption }) => /^https?:\/\//i.test(imageUrl) && (
        <a key={attachmentId} href={imageUrl} target="_blank" rel="noreferrer" className="block text-[#155e59] underline">
          {caption || "Ảnh tham khảo"}
        </a>
      ))}
      {error && <div role="alert">
        <p className="text-red-700">{error}</p>
        <button type="button" className="min-h-11 underline" onClick={() => { setError(""); reload((value) => value + 1); }}>Tải lại chi tiết</button>
      </div>}
      {notice && <p role="status">{notice}</p>}
      {canReadHistory(displayStatus) && (
        <Link href={`/staff/commission/${commissionId}/chat`}
          className="inline-flex min-h-11 items-center rounded-lg border border-[#155e59] px-4 font-semibold text-[#155e59] hover:bg-[#eaf5e8]">
          Mở phòng chat với khách
        </Link>
      )}
      {!assigned && idleHints[displayStatus] && (
        <p className="rounded-lg bg-[#f4f8f3] px-3 py-2 text-sm text-[#526159]">{idleHints[displayStatus]}</p>
      )}
      {!assigned && detail?.submissions && (
        <StaffDraftReview commissionId={commissionId} status={displayStatus} drafts={detail.submissions}
          onChanged={() => { onChange(); reload((value) => value + 1); }} />
      )}
      {/* Không chờ brief: assign/approve chỉ cần commissionId, nên lỗi tải chi tiết không được làm mất nút. */}
      {!assigned && displayStatus === status && (status === "PAID" || status === "PENDING_REVIEW") && (
        <form onSubmit={submit} className="space-y-3">
          {status === "PAID" && (
            <label className="block font-semibold">Designer phụ trách
              <select className="mt-1 block min-h-11 w-full rounded-lg border border-[#819e8c] bg-white px-3"
                value={designerId} onChange={(event) => setDesignerId(event.target.value)} disabled={busy || !designers?.length}>
                <option value="">{designersFailed ? "Không tải được danh sách designer" : !designers ? "Đang tải designer…" : designers.length ? "Chọn designer" : "Chưa có designer hoạt động"}</option>
                {designers?.map((designer) => <option key={designer.designerId} value={designer.designerId}>{designer.fullName} (#{designer.designerId})</option>)}
              </select>
            </label>
          )}
          <button className={commissionButton} disabled={busy || (status === "PAID" && !designerId)}>
            {busy ? "Đang xử lý…" : status === "PAID" ? "Phân công designer" : "Duyệt và mở thanh toán"}
          </button>
        </form>
      )}
    </div>
  );
}
