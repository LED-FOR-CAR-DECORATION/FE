"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
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
  ShieldCheck,
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
    label: "Đã duyệt - Chờ khách mang đến",
    badgeClass: "bg-[#e0f2fe] text-black",
    icon: Store,
  },
  REJECTED: {
    label: "Từ chối",
    badgeClass: "bg-[#fecaca] text-black",
    icon: ShieldAlert,
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    badgeClass: "bg-primary text-black",
    icon: CheckCircle2,
  },
};

export default function StaffWarrantyManagementPage() {
  const { user } = useAuth();
  void user;

  const { rows: pageSize, ready } = useAdaptiveListRows({
    estimatedRowHeight: 62,
    rowGap: 0,
    chromeHeight: 530,
    minRows: 2,
    maxRows: 10,
    defaultRows: 4,
  });

  const [claims, setClaims] = useState<ManagementWarrantyClaimItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
  });
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

  const loadStats = useCallback(async () => {
    try {
      const [allRes, pendingRes, approvedRes, completedRes, rejectedRes] = await Promise.all([
        getManagementWarrantyClaims({ page: 0, size: 1 }),
        getManagementWarrantyClaims({ status: "PENDING", page: 0, size: 1 }),
        getManagementWarrantyClaims({ status: "APPROVED", page: 0, size: 1 }),
        getManagementWarrantyClaims({ status: "COMPLETED", page: 0, size: 1 }),
        getManagementWarrantyClaims({ status: "REJECTED", page: 0, size: 1 }),
      ]);
      setStats({
        total: allRes.totalElements,
        pending: pendingRes.totalElements,
        approved: approvedRes.totalElements,
        completed: completedRes.totalElements,
        rejected: rejectedRes.totalElements,
      });
    } catch {
      // Keep previous stats if lightweight count refresh fails
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Fetch single backend page of claims
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);

    getManagementWarrantyClaims({
      status: selectedStatus === "ALL" ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page,
      size: pageSize,
    })
      .then((res) => {
        if (!active) return;
        const nextTotalPages = Math.max(1, res.totalPages || 1);
        if (page > 0 && page >= nextTotalPages) {
          setPage(Math.max(0, nextTotalPages - 1));
          return;
        }
        setClaims(res.items || []);
        setTotalElements(res.totalElements);
        setTotalPages(nextTotalPages);
      })
      .catch((err: any) => {
        if (!active) return;
        console.error("Failed to load warranty claims", err);
        setErrorMessage(err.message || "Không thể tải danh sách phiếu bảo hành.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ready, selectedStatus, debouncedSearch, page, pageSize, reloadTick]);

  const refreshClaims = useCallback(() => {
    void loadStats();
    setReloadTick((tick) => tick + 1);
  }, [loadStats]);

  const autoOpenedTicketRef = useRef<string | null>(null);

  // Auto-open ticket detail once if navigated from Manager Dashboard with ?ticketId=
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
        if (found) setDetailClaim(found);
      })
      .catch(() => {});
  }, [claims, ready, isLoading]);

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

  // Close modal helper stays above; status filter handler resets to page 0
  const handleStatusChange = (nextStatus: string) => {
    setSelectedStatus(nextStatus);
    setPage(0);
  };

  // Open action confirmation modal ONLY (closes detail modal if open)
  const handleOpenAction = (
    claim: ManagementWarrantyClaimItem,
    action: "APPROVE" | "REJECT" | "COMPLETE"
  ) => {
    setDetailClaim(null); // Close detail modal so they never stack
    setActionClaim(claim);
    setActionType(action);
    setActionError(null);

    if (action === "APPROVE") {
      setResolutionNotes(
        "Đã duyệt tiếp nhận bảo hành. Vui lòng mang thiết bị đến cửa hàng Lumintra gần nhất để kỹ thuật viên kiểm tra xử lý."
      );
    } else {
      setResolutionNotes("");
    }
  };

  // Submit action
  const handleConfirmAction = async () => {
    if (!actionClaim || !actionType) return;

    let targetStatus: WarrantyTicketStatus;
    if (actionType === "APPROVE") targetStatus = "APPROVED";
    else if (actionType === "REJECT") targetStatus = "REJECTED";
    else targetStatus = "COMPLETED";

    const trimmedNotes = resolutionNotes.trim();

    // Validate per API Contract
    if ((targetStatus === "REJECTED" || targetStatus === "COMPLETED") && !trimmedNotes) {
      setActionError(
        targetStatus === "REJECTED"
          ? "Bắt buộc phải nhập lý do từ chối yêu cầu bảo hành."
          : "Bắt buộc phải nhập ghi chú kết quả sửa chữa / linh kiện thay thế khi hoàn thành."
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
    } catch (err: any) {
      setActionError(err.message || "Xử lý phiếu bảo hành thất bại. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const statCards = [
    {
      id: "ALL",
      title: "Tổng số yêu cầu",
      subtitle: "Toàn bộ phiếu bảo hành",
      value: stats.total,
      icon: ShieldCheck,
      iconBoxClass: "bg-primary",
      badgeLabel: `${stats.rejected} từ chối`,
      badgeClass: stats.rejected > 0 ? "bg-[#fecaca] text-black" : "bg-white text-black",
      footerText: "Nhấn để xem tất cả yêu cầu",
    },
    {
      id: "PENDING",
      title: "Chờ duyệt",
      subtitle: "Cần nhân viên thẩm định",
      value: stats.pending,
      icon: Clock,
      iconBoxClass: stats.pending > 0 ? "bg-[#fef08a]" : "bg-primary/50",
      badgeLabel: stats.pending > 0 ? "Cần xử lý" : "Ổn định",
      badgeClass: stats.pending > 0 ? "bg-[#fef08a] text-black" : "bg-primary text-black",
      footerText: "Ưu tiên duyệt tiếp nhận sớm",
    },
    {
      id: "APPROVED",
      title: "Chờ tại quầy",
      subtitle: "Đã duyệt · Đợi khách mang đến",
      value: stats.approved,
      icon: Store,
      iconBoxClass: "bg-[#e0f2fe]",
      badgeLabel: "Đang mở",
      badgeClass: "bg-[#e0f2fe] text-black",
      footerText: "Kiểm tra & hoàn tất tại quầy",
    },
    {
      id: "COMPLETED",
      title: "Đã hoàn thành",
      subtitle: "Đã sửa chữa & bàn giao",
      value: stats.completed,
      icon: CheckCircle2,
      iconBoxClass: "bg-primary",
      badgeLabel: "Hoàn tất",
      badgeClass: "bg-primary text-black",
      footerText: "Đã hoàn tất quy trình bảo hành",
    },
  ] as const;

  const statusTabs = [
    { id: "ALL", label: "Tất cả" },
    { id: "PENDING", label: "Chờ duyệt" },
    { id: "APPROVED", label: "Chờ tại quầy" },
    { id: "COMPLETED", label: "Hoàn thành" },
    { id: "REJECTED", label: "Từ chối" },
  ] as const;

  return (
    <div className="manager-neo-dashboard mx-auto w-full max-w-[1440px] font-sans text-text-main">
      <div className="flex min-h-[calc(100dvh-114px)] flex-col gap-3">
        {/* Top Header Banner */}
        <header className="shrink-0 border-2 border-black border-l-8 border-l-primary bg-white px-4 py-3 shadow-[4px_4px_0_0_#000] sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  BẢO HÀNH THIẾT BỊ
                </span>
                <nav
                  aria-label="Đường dẫn"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                >
                  <span>Quản lý</span>
                  <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                  <span className="text-black">Quản lý bảo hành</span>
                </nav>
              </div>

              <div className="flex items-center gap-2.5">
                <ShieldCheck
                  size={22}
                  className="shrink-0 text-primary-ink"
                  aria-hidden="true"
                />
                <h1 className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">
                  Quản lý bảo hành thiết bị LED
                </h1>
              </div>

              <p className="text-xs font-medium text-text-muted">
                Tiếp nhận xét duyệt, hướng dẫn khách hàng và xử lý sửa chữa/đổi mới phần cứng tại quầy.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={refreshClaims}
                disabled={isLoading}
                className="btn-secondary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                Làm mới
              </button>
            </div>
          </div>
        </header>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            role={feedbackMessage.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`flex items-start justify-between gap-3 border-2 border-black p-4 text-xs font-bold text-black shadow-[4px_4px_0_0_#000] sm:text-sm ${
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
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] p-4 text-xs font-bold text-black shadow-[4px_4px_0_0_#000] sm:text-sm"
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

        {/* KPI Stat Cards */}
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const CardIcon = card.icon;
            const isActive = selectedStatus === card.id;
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleStatusChange(card.id)}
                className={`flex h-full cursor-pointer flex-col justify-between border-2 border-black p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:p-3.5 ${
                  isActive
                    ? "-translate-y-0.5 bg-primary/20 shadow-[6px_6px_0_0_#000]"
                    : "bg-white shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000]"
                }`}
              >
                <div className="w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <div
                        className={`grid h-8 w-8 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${card.iconBoxClass}`}
                      >
                        <CardIcon className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase leading-snug tracking-wider text-black">
                          {card.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-medium leading-snug text-text-muted">
                          {card.subtitle}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center border border-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap shadow-[1px_1px_0_0_#000] ${card.badgeClass}`}
                    >
                      {card.badgeLabel}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-black tracking-tight text-black tabular-nums sm:text-2xl">
                      {card.value.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      phiếu
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex w-full items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 pt-2">
                  <span className="truncate text-[11px] font-medium text-text-muted">{card.footerText}</span>
                  {isActive && (
                    <span className="inline-flex shrink-0 items-center border border-black bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                      Đang lọc
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter / Status Tabs & Search Toolbar */}
        <div className="flex shrink-0 flex-col gap-2.5 border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000] lg:flex-row lg:items-center lg:justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm phiếu bảo hành"
              placeholder="Tìm theo mã phiếu, Serial number, tên thiết bị, tên hoặc SĐT khách..."
              className="w-full border-2 border-black bg-gray-50 py-2 pl-9 pr-9 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white"
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer border border-black bg-white p-0.5 text-black transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div
            role="group"
            aria-label="Lọc theo trạng thái bảo hành"
            className="flex flex-wrap items-center gap-1.5"
          >
            {statusTabs.map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleStatusChange(tab.id)}
                  className={`shrink-0 cursor-pointer border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    isActive
                      ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                      : "bg-white text-black hover:bg-primary/20"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Warranty Claims Table */}
        <section
          aria-label="Danh sách phiếu bảo hành"
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0_0_#000]"
        >
          <div className="min-h-0 flex-1 overflow-x-auto">
            {isLoading ? (
              <table className="w-full min-w-[760px] border-collapse text-left text-xs text-black">
                <thead className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã phiếu</th>
                    <th className="px-4 py-3 text-left">Khách hàng</th>
                    <th className="px-4 py-3 text-left">Thiết bị</th>
                    <th className="px-4 py-3 text-left">Mô tả sự cố</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 bg-white">
                  {Array.from({ length: pageSize }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-gray-200" /></td>
                      <td className="px-4 py-3">
                        <div className="h-3.5 w-28 bg-gray-200" />
                        <div className="mt-1 h-3 w-24 bg-gray-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-3.5 w-24 bg-gray-200" />
                        <div className="mt-1 h-4 w-28 bg-gray-100" />
                      </td>
                      <td className="px-4 py-3"><div className="h-3.5 w-40 bg-gray-200" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 bg-gray-200" /></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-24 bg-gray-100" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-7 w-24 bg-gray-200" /></td>
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
              <table className="w-full min-w-[760px] border-collapse text-left text-xs text-black">
                <thead className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã phiếu</th>
                    <th className="px-4 py-3 text-left">Khách hàng</th>
                    <th className="px-4 py-3 text-left">Thiết bị</th>
                    <th className="px-4 py-3 text-left">Mô tả sự cố</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 bg-white font-medium">
                  {claims.map((claim) => {
                  const config = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = config.icon;

                  return (
                    <tr
                      key={claim.ticketId}
                      className="transition-colors duration-150 hover:bg-[#f3faf5]"
                    >
                      {/* Ticket ID */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-sm font-black text-black tabular-nums">
                        #{claim.ticketId}
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-black text-black sm:text-sm">
                          {claim.customerName}
                        </p>
                        <p className="text-[11px] font-bold text-text-muted tabular-nums">
                          {claim.customerPhone || "—"}
                        </p>
                        <p className="max-w-[160px] truncate text-[11px] font-medium text-text-muted">
                          {claim.customerEmail}
                        </p>
                      </td>

                      {/* Device & Serial */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-black uppercase text-black">
                          {claim.deviceName}
                        </p>
                        <span className="mt-1 inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-black">
                          {claim.deviceSerialNumber}
                        </span>
                      </td>

                      {/* Issue summary */}
                      <td className="max-w-[180px] px-4 py-3.5 sm:max-w-xs">
                        <p
                          className="truncate text-xs font-medium text-black"
                          title={claim.issueDescription}
                        >
                          {claim.issueDescription}
                        </p>
                        {claim.evidenceMediaUrls && claim.evidenceMediaUrls.length > 0 && (
                          <span className="mt-1.5 inline-flex items-center gap-1 border border-black bg-primary/25 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                            <Paperclip size={11} aria-hidden="true" />
                            {claim.evidenceMediaUrls.length} ảnh
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] ${config.badgeClass}`}
                        >
                          <StatusIcon size={12} aria-hidden="true" />
                          {config.label}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-text-muted tabular-nums">
                        {new Date(claim.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailClaim(claim)}
                            className="btn-secondary inline-flex items-center gap-1.5 px-2.5! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                          >
                            <Eye size={13} aria-hidden="true" />
                            Chi tiết
                          </button>

                          {/* Quick buttons per status - Opens ONLY Action Modal */}
                          {claim.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleOpenAction(claim, "APPROVE")}
                              className="btn-primary inline-flex items-center px-2.5! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                            >
                              Duyệt tiếp nhận
                            </button>
                          )}

                          {claim.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleOpenAction(claim, "COMPLETE")}
                              className="btn-primary inline-flex items-center px-2.5! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                            >
                              Hoàn tất tại quầy
                            </button>
                          )}
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
              {/* Customer & Device Information */}
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

              {/* Customer Reported Issue */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Mô tả sự cố từ khách hàng
                </h3>
                <div className="mt-1.5 whitespace-pre-wrap border-2 border-black bg-white p-3.5 text-xs leading-relaxed font-medium text-black sm:text-sm">
                  {detailClaim.issueDescription}
                </div>
              </div>

              {/* Evidence Photos */}
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

              {/* Existing Resolution Notes */}
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
                {/* Actions when PENDING */}
                {detailClaim.status === "PENDING" && (
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

                {/* Actions when APPROVED */}
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

      {/* Action Confirmation Modal ONLY (Opens directly when clicking 'Duyệt tiếp nhận', 'Hoàn tất', or 'Từ chối') */}
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
