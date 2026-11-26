"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getManagementWarrantyClaims,
  processWarrantyClaim,
  WARRANTY_CHANGED_EVENT,
  type ManagementWarrantyClaimItem,
  type WarrantyTicketStatus,
} from "@/lib/api/warranty";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";
import CommissionPagination from "@/features/commission/components/CommissionPagination";

const TABLE_COLUMNS: { label: string; className: string }[] = [
  { label: "Mã phiếu", className: "w-[96px] text-left" },
  { label: "Khách hàng", className: "w-[200px] text-left" },
  { label: "Thiết bị", className: "w-[190px] text-left" },
  { label: "Mô tả sự cố", className: "text-left" },
  { label: "Trạng thái", className: "w-[136px] text-left" },
  { label: "Ngày tạo", className: "w-[136px] text-left" },
  { label: "Thao tác", className: "w-[128px] text-right" },
];

export type WarrantyQueueMode = "manager" | "staff";

interface ManagementWarrantyQueueProps {
  mode: WarrantyQueueMode;
}

const STATUS_CONFIG: Record<
  WarrantyTicketStatus,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Chờ duyệt",
    badgeClass: "bg-[#fef08a] text-black",
    icon: Clock,
  },
  APPROVED: {
    label: "Chờ tại quầy",
    badgeClass: "bg-[#e0f2fe] text-black",
    icon: Store,
  },
  COMPLETED: {
    label: "Hoàn thành",
    badgeClass: "bg-primary text-black",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Từ chối",
    badgeClass: "bg-[#fecaca] text-black",
    icon: ShieldAlert,
  },
};

const MANAGER_STATUS_OPTIONS: Array<{ value: WarrantyTicketStatus; label: string }> = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Chờ tại quầy" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "REJECTED", label: "Từ chối" },
];

const STAFF_STATUS_OPTIONS: Array<{ value: WarrantyTicketStatus; label: string }> = [
  { value: "APPROVED", label: "Chờ tại quầy" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "REJECTED", label: "Từ chối" },
];

const STAFF_ALLOWED_STATUSES: WarrantyTicketStatus[] = ["APPROVED", "COMPLETED", "REJECTED"];

async function fetchAllClaimsForStatus(
  status: WarrantyTicketStatus,
  search?: string,
): Promise<ManagementWarrantyClaimItem[]> {
  const firstPage = await getManagementWarrantyClaims({
    status,
    search,
    page: 0,
    size: 100,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items || [];
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, idx) =>
      getManagementWarrantyClaims({
        status,
        search,
        page: idx + 1,
        size: 100,
      }),
    ),
  );

  return [
    ...(firstPage.items || []),
    ...remainingPages.flatMap((res) => res.items || []),
  ];
}

function WarrantyHoverButton({
  label,
  ariaLabel,
  icon,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={label}
      className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      {icon}
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[96px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[96px] group-focus-visible/btn:opacity-100">
        {label}
      </span>
    </button>
  );
}

export default function ManagementWarrantyQueue({ mode }: ManagementWarrantyQueueProps) {
  const { user } = useAuth();
  void user;

  const isStaffMode = mode === "staff";
  const statusOptions = useMemo(
    () => (isStaffMode ? STAFF_STATUS_OPTIONS : MANAGER_STATUS_OPTIONS),
    [isStaffMode],
  );

  const { rows: pageSize, ready } = useAdaptiveListRows({
    estimatedRowHeight: 62,
    rowGap: 0,
    chromeHeight: 306,
    minRows: 3,
    maxRows: 12,
    defaultRows: 6,
  });

  const [claims, setClaims] = useState<ManagementWarrantyClaimItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadTick, setReloadTick] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const lastSearchRef = useRef("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Separate states for Detail Modal vs Action Modal so they NEVER overlap
  const [detailClaim, setDetailClaim] = useState<ManagementWarrantyClaimItem | null>(null);
  const [actionClaim, setActionClaim] = useState<ManagementWarrantyClaimItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "COMPLETE" | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Debounce search input without triggering extra initial fetch on mount
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed === lastSearchRef.current) return;
    const timer = window.setTimeout(() => {
      lastSearchRef.current = trimmed;
      setPage(0);
      setDebouncedSearch(trimmed);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Fetch claims cleanly (server-side paging whenever a single status or Manager "ALL" is active;
  // Staff "ALL" merges APPROVED, COMPLETED, REJECTED to exclude PENDING without empty holes)
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);

    const searchQuery = debouncedSearch || undefined;

    const loadClaims = async () => {
      if (isStaffMode && selectedStatus === "ALL") {
        const groups = await Promise.all(
          STAFF_ALLOWED_STATUSES.map((status) => fetchAllClaimsForStatus(status, searchQuery)),
        );
        const byTicketId = new Map<number, ManagementWarrantyClaimItem>();
        for (const item of groups.flat()) {
          if (!byTicketId.has(item.ticketId)) {
            byTicketId.set(item.ticketId, item);
          }
        }
        const merged = Array.from(byTicketId.values()).sort(
          (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
        );
        const nextTotalElements = merged.length;
        const nextTotalPages = Math.max(1, Math.ceil(nextTotalElements / pageSize));
        if (!active) return;
        if (page > 0 && page >= nextTotalPages) {
          setPage(Math.max(0, nextTotalPages - 1));
          return;
        }
        const start = page * pageSize;
        setClaims(merged.slice(start, start + pageSize));
        setTotalElements(nextTotalElements);
        setTotalPages(nextTotalPages);
        return;
      }

      const effectiveStatus = selectedStatus === "ALL" ? undefined : selectedStatus;
      const res = await getManagementWarrantyClaims({
        status: effectiveStatus,
        search: searchQuery,
        page,
        size: pageSize,
      });
      if (!active) return;
      const nextTotalPages = Math.max(1, res.totalPages || 1);
      if (page > 0 && page >= nextTotalPages) {
        setPage(Math.max(0, nextTotalPages - 1));
        return;
      }
      setClaims(res.items || []);
      setTotalElements(res.totalElements);
      setTotalPages(nextTotalPages);
    };

    loadClaims()
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Không thể tải danh sách phiếu bảo hành.";
        console.error("Failed to load warranty claims", err);
        setErrorMessage(message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ready, isStaffMode, selectedStatus, debouncedSearch, page, pageSize, reloadTick]);

  const refreshClaims = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const autoOpenedTicketRef = useRef<string | null>(null);

  // Auto-open ticket detail once if navigated from Dashboard with ?ticketId=
  useEffect(() => {
    const ticketIdParam = new URLSearchParams(window.location.search).get("ticketId");
    if (!ticketIdParam || autoOpenedTicketRef.current === ticketIdParam) return;
    const match = claims.find((c) => String(c.ticketId) === ticketIdParam);
    if (match) {
      autoOpenedTicketRef.current = ticketIdParam;
      setDetailClaim(match);
      return;
    }
    if (!ready || isLoading) return;
    autoOpenedTicketRef.current = ticketIdParam;
    getManagementWarrantyClaims({ search: ticketIdParam, page: 0, size: 10 })
      .then((res) => {
        const found = (res.items || []).find((c) => String(c.ticketId) === ticketIdParam);
        if (found && (!isStaffMode || found.status !== "PENDING")) {
          setDetailClaim(found);
        }
      })
      .catch(() => {});
  }, [claims, ready, isLoading, isStaffMode]);

  // Sync with global change events
  useEffect(() => {
    const handleWarrantyChange = () => {
      refreshClaims();
    };
    window.addEventListener(WARRANTY_CHANGED_EVENT, handleWarrantyChange);
    return () => {
      window.removeEventListener(WARRANTY_CHANGED_EVENT, handleWarrantyChange);
    };
  }, [refreshClaims]);

  const handleCloseAction = useCallback(() => {
    setActionClaim(null);
    setActionType(null);
    setActionError(null);
    setResolutionNotes("");
  }, []);

  // Keyboard accessibility: Escape closes topmost open modal/lightbox
  useEffect(() => {
    if (!previewImage && !actionClaim && !detailClaim) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (previewImage) {
        setPreviewImage(null);
      } else if (actionClaim && !isProcessing) {
        handleCloseAction();
      } else if (detailClaim) {
        setDetailClaim(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [previewImage, actionClaim, detailClaim, isProcessing, handleCloseAction]);

  const handleStatusChange = (nextStatus: string) => {
    setSelectedStatus(nextStatus);
    setPage(0);
  };

  // Open action confirmation modal ONLY (closes detail modal if open)
  const handleOpenAction = (
    claim: ManagementWarrantyClaimItem,
    action: "APPROVE" | "REJECT" | "COMPLETE",
  ) => {
    setDetailClaim(null);
    setActionClaim(claim);
    setActionType(action);
    setActionError(null);

    if (action === "APPROVE") {
      setResolutionNotes(
        "Đã duyệt tiếp nhận bảo hành. Vui lòng mang thiết bị đến cửa hàng Lumintra gần nhất để kỹ thuật viên kiểm tra xử lý.",
      );
    } else {
      setResolutionNotes("");
    }
  };

  const handleConfirmAction = async () => {
    if (!actionClaim || !actionType) return;

    let targetStatus: WarrantyTicketStatus;
    if (actionType === "APPROVE") targetStatus = "APPROVED";
    else if (actionType === "REJECT") targetStatus = "REJECTED";
    else targetStatus = "COMPLETED";

    const trimmedNotes = resolutionNotes.trim();

    if ((targetStatus === "REJECTED" || targetStatus === "COMPLETED") && !trimmedNotes) {
      setActionError(
        targetStatus === "REJECTED"
          ? "Bắt buộc phải nhập lý do từ chối yêu cầu bảo hành."
          : "Bắt buộc phải nhập ghi chú kết quả sửa chữa / linh kiện thay thế khi hoàn thành.",
      );
      return;
    }

    setIsProcessing(true);
    setActionError(null);

    try {
      await processWarrantyClaim(actionClaim.ticketId, {
        status: targetStatus,
        resolutionNotes: trimmedNotes || undefined,
      });

      setFeedbackMessage({
        type: "success",
        text:
          targetStatus === "APPROVED"
            ? `Đã duyệt phiếu #${actionClaim.ticketId}. Hệ thống đã gửi email thông báo khách hàng mang thiết bị đến cửa hàng.`
            : targetStatus === "COMPLETED"
              ? `Đã hoàn thành bảo hành phiếu #${actionClaim.ticketId} thành công!`
              : `Đã từ chối phiếu bảo hành #${actionClaim.ticketId}.`,
      });

      handleCloseAction();
      refreshClaims();
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Xử lý phiếu bảo hành thất bại. Vui lòng thử lại.";
      setActionError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="manager-neo-dashboard mx-auto w-full max-w-[1440px] font-sans text-text-main">
      <div className="flex min-h-[calc(100dvh-114px)] flex-col gap-3 xl:h-[calc(100dvh-114px)]">
        {/* Compact Header & Toolbar (modeled after /staff/commission) */}
        <header className="flex shrink-0 flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs font-black uppercase tracking-widest text-primary-ink">
              {isStaffMode ? "Staff Workspace" : "Manager Workspace"}
            </p>
            <h1 className="mt-0.5 text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
              {isStaffMode ? "Xử lý bảo hành tại quầy" : "Quản lý bảo hành"}
            </h1>
            <p className="mt-0.5 text-xs text-black/75 sm:text-sm">
              {isStaffMode
                ? "Tiếp nhận thiết bị chờ tại quầy, hoàn tất sửa chữa và theo dõi phiếu đã xử lý."
                : "Thẩm định yêu cầu bảo hành, theo dõi tiếp nhận tại quầy và xử lý hoàn tất."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Compact Search */}
            <div className="relative w-full sm:w-[260px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Tìm kiếm phiếu bảo hành"
                placeholder="Tìm mã phiếu, Serial, khách..."
                className="w-full border-2 border-black bg-white py-1.5 pl-8 pr-8 text-xs font-bold text-black shadow-[2px_2px_0_0_#000] placeholder:font-medium placeholder:text-black/50 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    lastSearchRef.current = "";
                    setDebouncedSearch("");
                    setPage(0);
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border border-black bg-white p-0.5 text-black transition-colors hover:bg-primary"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <label className="inline-flex items-center gap-2 border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              <span className="shrink-0 uppercase text-black/65">Trạng thái:</span>
              <select
                aria-label="Lọc theo trạng thái bảo hành"
                disabled={isLoading}
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-transparent font-bold text-black focus:outline-none disabled:opacity-50"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={isLoading}
              onClick={refreshClaims}
              className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Làm mới
            </button>
          </div>
        </header>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            role={feedbackMessage.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`flex shrink-0 items-start justify-between gap-3 border-2 border-black p-3.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000] sm:text-sm ${
              feedbackMessage.type === "success" ? "bg-primary/25" : "bg-[#fee2e2]"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border border-black ${
                  feedbackMessage.type === "success" ? "bg-primary" : "bg-[#fecaca]"
                }`}
              >
                {feedbackMessage.type === "success" ? (
                  <CheckCircle2 size={14} className="text-black" aria-hidden="true" />
                ) : (
                  <AlertCircle size={14} className="text-black" aria-hidden="true" />
                )}
              </span>
              <p className="font-bold leading-relaxed text-black">{feedbackMessage.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              aria-label="Đóng thông báo"
              className="btn-secondary shrink-0 p-1! shadow-[2px_2px_0_0_#000]"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div
            role="alert"
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] p-3.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000] sm:text-sm"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <div>
                <p className="font-black uppercase tracking-wide text-black">Lỗi kết nối máy chủ</p>
                <p className="mt-0.5 text-xs font-medium text-black">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshClaims}
              className="btn-secondary px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Warranty Claims Table */}
        <section
          aria-label="Danh sách phiếu bảo hành"
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0_0_#000]"
        >
          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <table className="w-full min-w-[1150px] table-fixed border-collapse text-left text-xs text-black">
                <thead className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <tr>
                    {TABLE_COLUMNS.map((col) => (
                      <th key={col.label} className={`px-4 py-2.5 ${col.className}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 bg-white">
                  {Array.from({ length: pageSize }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="px-4 py-2"><div className="h-4 w-12 bg-gray-200" /></td>
                      <td className="px-4 py-2">
                        <div className="h-4 w-28 bg-gray-200" />
                        <div className="mt-1 h-3.5 w-36 bg-gray-100" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-4 w-24 bg-gray-200" />
                        <div className="mt-1 h-5 w-28 bg-gray-100" />
                      </td>
                      <td className="px-4 py-2"><div className="h-4 w-40 bg-gray-200" /></td>
                      <td className="px-4 py-2"><div className="h-5 w-24 bg-gray-200" /></td>
                      <td className="px-4 py-2"><div className="h-4 w-24 bg-gray-100" /></td>
                      <td className="px-4 py-2 text-right"><div className="ml-auto h-8 w-20 bg-gray-200" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : claims.length === 0 ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-black bg-gray-50 shadow-[2px_2px_0_0_#000]">
                  <Inbox size={24} className="text-black" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-black uppercase tracking-wide text-black">
                  Không tìm thấy phiếu yêu cầu bảo hành nào
                </p>
                <p className="mt-1 text-xs font-medium text-text-muted">
                  Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[1150px] table-fixed border-collapse text-left text-xs text-black">
                <thead className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <tr>
                    {TABLE_COLUMNS.map((col) => (
                      <th key={col.label} className={`px-4 py-2.5 ${col.className}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 bg-white font-medium">
                  {claims.map((claim) => {
                    const config = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
                    const StatusIcon = config.icon;
                    const contactLine =
                      [claim.customerPhone, claim.customerEmail].filter(Boolean).join(" · ") || "—";

                    return (
                      <tr
                        key={claim.ticketId}
                        className="transition-colors duration-150 hover:bg-[#f3faf5]"
                      >
                        {/* Ticket ID */}
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-sm font-black text-black tabular-nums">
                          #{claim.ticketId}
                        </td>

                        {/* Customer Info */}
                        <td className="px-4 py-2">
                          <p
                            className="truncate text-xs font-black text-black sm:text-sm"
                            title={claim.customerName}
                          >
                            {claim.customerName}
                          </p>
                          <p
                            className="truncate text-[11px] font-medium text-text-muted tabular-nums"
                            title={contactLine}
                          >
                            {contactLine}
                          </p>
                        </td>

                        {/* Device & Serial */}
                        <td className="px-4 py-2">
                          <p
                            className="truncate text-xs font-black uppercase text-black"
                            title={claim.deviceName}
                          >
                            {claim.deviceName}
                          </p>
                          <span
                            className="mt-1 inline-flex max-w-full items-center truncate border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-black"
                            title={claim.deviceSerialNumber}
                          >
                            {claim.deviceSerialNumber}
                          </span>
                        </td>

                        {/* Issue summary */}
                        <td className="px-4 py-2">
                          <p
                            className="truncate text-xs font-medium text-black"
                            title={claim.issueDescription}
                          >
                            {claim.issueDescription}
                          </p>
                          {claim.evidenceMediaUrls && claim.evidenceMediaUrls.length > 0 && (
                            <span className="mt-1 inline-flex items-center gap-1 border border-black bg-primary/25 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                              <Paperclip size={11} aria-hidden="true" />
                              {claim.evidenceMediaUrls.length} ảnh
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-4 py-2">
                          <span
                            className={`inline-flex items-center gap-1.5 border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] ${config.badgeClass}`}
                          >
                            <StatusIcon size={12} aria-hidden="true" />
                            {config.label}
                          </span>
                        </td>

                        {/* Created At */}
                        <td className="whitespace-nowrap px-4 py-2 text-xs font-medium text-text-muted tabular-nums">
                          {new Date(claim.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                            <WarrantyHoverButton
                              label="Chi tiết"
                              ariaLabel={`Xem chi tiết phiếu #${claim.ticketId}`}
                              onClick={() => setDetailClaim(claim)}
                              icon={<Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <CommissionPagination
          page={page}
          size={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={(nextPage) => setPage(nextPage)}
          ariaLabel="Phân trang danh sách bảo hành"
          disabled={isLoading}
          className="mt-auto shrink-0"
        />
      </div>

      {/* Detail Modal ONLY (Only when clicking 'Chi tiết') */}
      {detailClaim && !actionClaim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailClaim(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="warranty-detail-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b-2 border-black p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2
                  id="warranty-detail-modal-title"
                  className="font-mono text-lg font-black uppercase tracking-tight text-black tabular-nums sm:text-xl"
                >
                  Phiếu #{detailClaim.ticketId}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] ${
                    STATUS_CONFIG[detailClaim.status]?.badgeClass
                  }`}
                >
                  {STATUS_CONFIG[detailClaim.status]?.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailClaim(null)}
                aria-label="Đóng chi tiết phiếu bảo hành"
                className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 border-2 border-black bg-gray-50 p-4 sm:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
                    <User size={13} className="text-black" aria-hidden="true" />
                    Thông tin khách hàng
                  </h3>
                  <p className="mt-1.5 text-sm font-black text-black">
                    {detailClaim.customerName}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-black tabular-nums">
                    <Phone size={12} className="text-text-muted" aria-hidden="true" />
                    {detailClaim.customerPhone || "Chưa có SĐT"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                    <Mail size={12} className="text-text-muted" aria-hidden="true" />
                    {detailClaim.customerEmail}
                  </p>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
                    <Store size={13} className="text-black" aria-hidden="true" />
                    Thiết bị cần bảo hành
                  </h3>
                  <p className="mt-1.5 text-sm font-black uppercase text-black">
                    {detailClaim.deviceName}
                  </p>
                  <p className="mt-1 inline-flex items-center border border-black bg-white px-2 py-0.5 font-mono text-xs font-bold text-primary-ink">
                    Serial: {detailClaim.deviceSerialNumber}
                  </p>
                  <p className="mt-1 text-xs font-medium text-text-muted tabular-nums">
                    ID thiết bị: #{detailClaim.deviceId}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Mô tả sự cố từ khách hàng
                </h3>
                <div className="mt-1.5 whitespace-pre-wrap border-2 border-black bg-white p-3.5 text-xs leading-relaxed font-medium text-black sm:text-sm">
                  {detailClaim.issueDescription}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Hình ảnh bằng chứng đính kèm ({detailClaim.evidenceMediaUrls?.length || 0})
                </h3>
                {detailClaim.evidenceMediaUrls && detailClaim.evidenceMediaUrls.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-3">
                    {detailClaim.evidenceMediaUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImage(url)}
                        aria-label={`Xem phóng to bằng chứng ${idx + 1}`}
                        className="group relative h-16 w-16 cursor-pointer overflow-hidden border-2 border-black bg-gray-100 shadow-[2px_2px_0_0_#000] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:h-20 sm:w-20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Bằng chứng ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                          <Eye size={16} className="text-white" aria-hidden="true" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 border-2 border-dashed border-black/25 bg-gray-50 px-3 py-2.5 text-xs font-medium text-text-muted">
                    Khách hàng không đính kèm hình ảnh.
                  </p>
                )}
              </div>

              {detailClaim.resolutionNotes && (
                <div
                  className={`border-2 border-black p-3.5 text-xs text-black ${
                    detailClaim.status === "APPROVED"
                      ? "bg-[#e0f2fe]"
                      : detailClaim.status === "COMPLETED"
                        ? "bg-primary/25"
                        : "bg-[#fee2e2]"
                  }`}
                >
                  <p className="flex items-center gap-1.5 font-black uppercase tracking-wider text-black">
                    <FileText size={14} aria-hidden="true" />
                    {detailClaim.status === "APPROVED"
                      ? "Hướng dẫn gửi khách hàng:"
                      : detailClaim.status === "COMPLETED"
                        ? "Kết quả xử lý bàn giao:"
                        : "Lý do từ chối:"}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap font-medium leading-relaxed text-black">
                    {detailClaim.resolutionNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col gap-3 border-t-2 border-dashed border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="text-xs font-bold text-text-muted tabular-nums">
                Tạo lúc: {new Date(detailClaim.createdAt).toLocaleString("vi-VN")}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {detailClaim.status === "PENDING" && !isStaffMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAction(detailClaim, "REJECT")}
                      className="btn-danger px-3.5 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAction(detailClaim, "APPROVE")}
                      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                    >
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Duyệt tiếp nhận
                    </button>
                  </>
                )}

                {detailClaim.status === "APPROVED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAction(detailClaim, "REJECT")}
                      className="btn-danger px-3.5 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                    >
                      Từ chối tại quầy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAction(detailClaim, "COMPLETE")}
                      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                    >
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Hoàn tất sửa chữa &amp; Bàn giao
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setDetailClaim(null)}
                  className="btn-secondary px-3.5 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionClaim && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={isProcessing ? undefined : handleCloseAction}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="warranty-action-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-black p-4 sm:p-5">
              <h2
                id="warranty-action-modal-title"
                className="text-sm font-black uppercase tracking-wider text-black sm:text-base"
              >
                {actionType === "APPROVE"
                  ? "Duyệt tiếp nhận bảo hành"
                  : actionType === "COMPLETE"
                    ? "Xác nhận hoàn tất bảo hành"
                    : "Từ chối yêu cầu bảo hành"}
              </h2>
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={isProcessing}
                aria-label="Đóng hộp thoại xác nhận"
                className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <p className="text-xs font-medium leading-relaxed text-black">
                Phiếu bảo hành:{" "}
                <strong className="font-mono font-black tabular-nums">
                  #{actionClaim.ticketId}
                </strong>{" "}
                — Khách hàng: <strong className="font-black">{actionClaim.customerName}</strong> (
                <span className="font-mono font-bold">{actionClaim.deviceSerialNumber}</span>)
              </p>

              {actionType === "APPROVE" && (
                <div className="flex items-start gap-2.5 border-2 border-black bg-[#e0f2fe] p-3 text-xs font-medium leading-relaxed text-black">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-black" aria-hidden="true" />
                  <p>
                    Khi duyệt tiếp nhận, trạng thái sẽ chuyển thành{" "}
                    <strong className="font-black">APPROVED</strong>. Hệ thống sẽ tự động gửi email
                    thông báo khách hàng mang thiết bị đến cửa hàng để nhân viên xử lý hoàn tất.
                  </p>
                </div>
              )}

              {actionType === "COMPLETE" && (
                <div className="flex items-start gap-2.5 border-2 border-black bg-primary/25 p-3 text-xs font-medium leading-relaxed text-black">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-black"
                    aria-hidden="true"
                  />
                  <p>
                    Khách hàng đã mang thiết bị đến cửa hàng. Xác nhận nhân viên kỹ thuật đã sửa
                    chữa / thay thế phần cứng và bàn giao lại cho khách.
                  </p>
                </div>
              )}

              {actionError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black"
                >
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-red-700"
                    aria-hidden="true"
                  />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="warranty-resolution-notes"
                  className="block text-xs font-black uppercase tracking-wider text-black"
                >
                  {actionType === "APPROVE"
                    ? "Ghi chú & Hướng dẫn cho khách hàng (Tùy chọn)"
                    : actionType === "COMPLETE"
                      ? "Ghi chú kết quả sửa chữa / linh kiện thay thế (Bắt buộc) *"
                      : "Lý do từ chối bảo hành (Bắt buộc) *"}
                </label>
                <textarea
                  id="warranty-resolution-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  maxLength={1000}
                  placeholder={
                    actionType === "APPROVE"
                      ? "Nhập hướng dẫn gửi khách hàng..."
                      : actionType === "COMPLETE"
                        ? "Mô tả linh kiện đã thay thế, kết quả chạy thử nghiệm và bàn giao khách..."
                        : "Nêu rõ nguyên nhân từ chối (rách tem, vào nước, can thiệp mạch...)"
                  }
                  rows={4}
                  className="mt-1.5 w-full border-2 border-black bg-gray-50 p-3 text-xs font-medium text-black placeholder:text-text-muted focus:bg-white"
                />
                <div className="mt-1 text-right text-[11px] font-bold text-text-muted tabular-nums">
                  {resolutionNotes.length} / 1000 ký tự
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 p-4 sm:px-5">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={isProcessing}
                className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] ${
                  actionType === "REJECT" ? "btn-danger" : "btn-primary"
                }`}
              >
                {isProcessing && (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                )}
                {actionType === "APPROVE"
                  ? "Xác nhận duyệt"
                  : actionType === "COMPLETE"
                    ? "Xác nhận hoàn thành"
                    : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem phóng to hình ảnh bằng chứng"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] max-w-[90vw] flex-col border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-center justify-between gap-4 border-b-2 border-black px-4 py-3">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Ảnh bằng chứng bảo hành
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                aria-label="Đóng xem ảnh"
                className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-auto bg-gray-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Ảnh phóng to"
                className="max-h-[75vh] max-w-[85vw] border-2 border-black object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
