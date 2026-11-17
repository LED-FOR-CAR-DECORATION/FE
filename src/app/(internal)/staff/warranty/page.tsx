"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Mail,
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

const STATUS_CONFIG: Record<
  WarrantyTicketStatus,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Chờ duyệt",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    icon: Clock,
  },
  APPROVED: {
    label: "Đã duyệt - Chờ khách mang đến",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    icon: Store,
  },
  REJECTED: {
    label: "Từ chối",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
    icon: ShieldAlert,
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: CheckCircle2,
  },
};

export default function StaffWarrantyManagementPage() {
  const { user } = useAuth();

  const [claims, setClaims] = useState<ManagementWarrantyClaimItem[]>([]);
  const [statsData, setStatsData] = useState<ManagementWarrantyClaimItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Separate states for Detail Modal vs Action Modal so they NEVER overlap
  const [detailClaim, setDetailClaim] = useState<ManagementWarrantyClaimItem | null>(null);
  const [actionClaim, setActionClaim] = useState<ManagementWarrantyClaimItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "COMPLETE" | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch claims from backend
  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getManagementWarrantyClaims({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        search: searchTerm.trim() || undefined,
        page: 0,
        size: 50,
      });
      setClaims(res.items || []);

      // Keep stats counts accurate even when a specific status filter is active
      if (selectedStatus !== "ALL" || searchTerm.trim()) {
        getManagementWarrantyClaims({ page: 0, size: 100 })
          .then((unfiltered) => setStatsData(unfiltered.items || []))
          .catch(() => {});
      } else {
        setStatsData(res.items || []);
      }
    } catch (err: any) {
      console.error("Failed to load warranty claims", err);
      setErrorMessage(err.message || "Không thể tải danh sách phiếu bảo hành.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, searchTerm]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Sync with global change events
  useEffect(() => {
    const handleWarrantyChange = () => {
      fetchClaims();
    };
    window.addEventListener(WARRANTY_CHANGED_EVENT, handleWarrantyChange);
    return () => {
      window.removeEventListener(WARRANTY_CHANGED_EVENT, handleWarrantyChange);
    };
  }, [fetchClaims]);

  // Calculate metrics
  const stats = useMemo(() => {
    const list = statsData.length > 0 ? statsData : claims;
    return {
      total: list.length,
      pending: list.filter((c) => c.status === "PENDING").length,
      approved: list.filter((c) => c.status === "APPROVED").length,
      completed: list.filter((c) => c.status === "COMPLETED").length,
      rejected: list.filter((c) => c.status === "REJECTED").length,
    };
  }, [statsData, claims]);

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

  const handleCloseAction = () => {
    setActionClaim(null);
    setActionType(null);
    setActionError(null);
    setResolutionNotes("");
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
      await fetchClaims();
    } catch (err: any) {
      setActionError(err.message || "Xử lý phiếu bảo hành thất bại. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white shadow-xs">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Quản Lý Bảo Hành Thiết Bị LED
            </h1>
            <p className="text-xs text-gray-500">
              Tiếp nhận xét duyệt, hướng dẫn khách hàng và xử lý sửa chữa/đổi mới phần cứng tại quầy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchClaims()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`flex items-start justify-between rounded-xl border p-3.5 text-xs sm:text-sm ${
            feedbackMessage.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <p className="font-semibold">{feedbackMessage.text}</p>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold">Lỗi kết nối máy chủ</p>
            <p className="mt-0.5 text-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Stat Cards - Responsive Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div
          onClick={() => setSelectedStatus("ALL")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 shadow-xs transition ${
            selectedStatus === "ALL"
              ? "border-teal-700 bg-teal-50/50 ring-2 ring-teal-600"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
            Tổng số yêu cầu
          </p>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-gray-900">{stats.total}</p>
        </div>

        <div
          onClick={() => setSelectedStatus("PENDING")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 shadow-xs transition ${
            selectedStatus === "PENDING"
              ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">
              Chờ duyệt
            </p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-amber-900">{stats.pending}</p>
        </div>

        <div
          onClick={() => setSelectedStatus("APPROVED")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 shadow-xs transition ${
            selectedStatus === "APPROVED"
              ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-700">
              Chờ tại quầy
            </p>
            <Store size={16} className="text-blue-500" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-blue-900">{stats.approved}</p>
        </div>

        <div
          onClick={() => setSelectedStatus("COMPLETED")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 shadow-xs transition ${
            selectedStatus === "COMPLETED"
              ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">
              Đã hoàn thành
            </p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-emerald-900">{stats.completed}</p>
        </div>
      </div>

      {/* Filters & Search Toolbar - Responsive */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã phiếu, Serial number, tên thiết bị, tên hoặc SĐT khách..."
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-9 text-xs text-gray-900 placeholder-gray-400 shadow-xs focus:border-teal-700 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Tab Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING", label: "Chờ duyệt" },
            { id: "APPROVED", label: "Chờ tại quầy" },
            { id: "COMPLETED", label: "Hoàn thành" },
            { id: "REJECTED", label: "Từ chối" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`rounded-lg px-3 py-1.5 sm:py-2 text-xs font-bold transition shrink-0 ${
                selectedStatus === tab.id
                  ? "bg-teal-800 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warranty Claims Table - Responsive Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-teal-800" />
            <span className="ml-2 text-sm text-gray-500">Đang tải danh sách bảo hành...</span>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-10 sm:p-12 text-center">
            <Inbox size={40} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-700">
              Không tìm thấy phiếu yêu cầu bảo hành nào
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs text-gray-700">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3.5 sm:px-4 py-3.5">Mã phiếu</th>
                  <th className="px-3.5 sm:px-4 py-3.5">Khách hàng</th>
                  <th className="px-3.5 sm:px-4 py-3.5">Thiết bị &amp; Serial</th>
                  <th className="px-3.5 sm:px-4 py-3.5">Mô tả sự cố</th>
                  <th className="px-3.5 sm:px-4 py-3.5">Trạng thái</th>
                  <th className="px-3.5 sm:px-4 py-3.5">Ngày tạo</th>
                  <th className="px-3.5 sm:px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {claims.map((claim) => {
                  const config = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = config.icon;

                  return (
                    <tr
                      key={claim.ticketId}
                      className="transition hover:bg-teal-50/20"
                    >
                      {/* Ticket ID */}
                      <td className="whitespace-nowrap px-3.5 sm:px-4 py-3.5 font-mono text-sm font-black text-gray-900">
                        #{claim.ticketId}
                      </td>

                      {/* Customer Info */}
                      <td className="px-3.5 sm:px-4 py-3.5">
                        <p className="font-bold text-gray-900">{claim.customerName}</p>
                        <p className="text-[11px] text-gray-500">{claim.customerPhone || "—"}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{claim.customerEmail}</p>
                      </td>

                      {/* Device & Serial */}
                      <td className="px-3.5 sm:px-4 py-3.5">
                        <p className="font-bold text-gray-900">{claim.deviceName}</p>
                        <p className="font-mono text-[11px] text-teal-800">
                          {claim.deviceSerialNumber}
                        </p>
                      </td>

                      {/* Issue summary */}
                      <td className="max-w-[180px] sm:max-w-xs px-3.5 sm:px-4 py-3.5">
                        <p className="truncate text-xs text-gray-800" title={claim.issueDescription}>
                          {claim.issueDescription}
                        </p>
                        {claim.evidenceMediaUrls && claim.evidenceMediaUrls.length > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                            📎 {claim.evidenceMediaUrls.length} ảnh
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-3.5 sm:px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:text-xs font-bold ${config.badgeClass}`}
                        >
                          <StatusIcon size={12} />
                          {config.label}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="whitespace-nowrap px-3.5 sm:px-4 py-3.5 text-gray-500 text-[11px]">
                        {new Date(claim.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-3.5 sm:px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setDetailClaim(claim)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50"
                          >
                            <Eye size={13} />
                            Chi tiết
                          </button>

                          {/* Quick buttons per status - Opens ONLY Action Modal */}
                          {claim.status === "PENDING" && (
                            <button
                              onClick={() => handleOpenAction(claim, "APPROVE")}
                              className="rounded-lg bg-teal-800 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-900"
                            >
                              Duyệt tiếp nhận
                            </button>
                          )}

                          {claim.status === "APPROVED" && (
                            <button
                              onClick={() => handleOpenAction(claim, "COMPLETE")}
                              className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
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
          </div>
        )}
      </div>

      {/* Detail Modal ONLY (Only when clicking 'Chi tiết') */}
      {detailClaim && !actionClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="font-mono text-lg sm:text-xl font-black text-gray-900">
                  Phiếu #{detailClaim.ticketId}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    STATUS_CONFIG[detailClaim.status]?.badgeClass
                  }`}
                >
                  {STATUS_CONFIG[detailClaim.status]?.label}
                </span>
              </div>
              <button
                onClick={() => setDetailClaim(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
              {/* Customer & Device Information */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 sm:p-4">
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500">
                    <User size={13} /> Thông tin khách hàng
                  </h4>
                  <p className="mt-1.5 text-sm font-bold text-gray-900">
                    {detailClaim.customerName}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1">
                    <Phone size={12} className="text-gray-400" />
                    {detailClaim.customerPhone || "Chưa có SĐT"}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} className="text-gray-400" />
                    {detailClaim.customerEmail}
                  </p>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500">
                    <Store size={13} /> Thiết bị cần bảo hành
                  </h4>
                  <p className="mt-1.5 text-sm font-bold text-gray-900">
                    {detailClaim.deviceName}
                  </p>
                  <p className="text-xs font-mono text-teal-800 mt-1">
                    Serial: {detailClaim.deviceSerialNumber}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ID thiết bị: #{detailClaim.deviceId}
                  </p>
                </div>
              </div>

              {/* Customer Reported Issue */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Mô tả sự cố từ khách hàng
                </h4>
                <div className="mt-1.5 rounded-xl border border-gray-200 bg-white p-3 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {detailClaim.issueDescription}
                </div>
              </div>

              {/* Evidence Photos */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Hình ảnh bằng chứng đính kèm ({detailClaim.evidenceMediaUrls?.length || 0})
                </h4>
                {detailClaim.evidenceMediaUrls && detailClaim.evidenceMediaUrls.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {detailClaim.evidenceMediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(url)}
                        className="group relative h-16 w-16 sm:h-20 sm:w-20 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
                      >
                        <img
                          src={url}
                          alt={`Bằng chứng ${idx + 1}`}
                          className="h-full w-full object-cover transition group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400 italic">Khách hàng không đính kèm hình ảnh.</p>
                )}
              </div>

              {/* Existing Resolution Notes */}
              {detailClaim.resolutionNotes && (
                <div
                  className={`rounded-xl border p-3.5 text-xs ${
                    detailClaim.status === "APPROVED"
                      ? "border-blue-300 bg-blue-50 text-blue-900"
                      : detailClaim.status === "COMPLETED"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-red-300 bg-red-50 text-red-900"
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5">
                    <FileText size={14} />
                    {detailClaim.status === "APPROVED"
                      ? "Hướng dẫn gửi khách hàng:"
                      : detailClaim.status === "COMPLETED"
                      ? "Kết quả xử lý bàn giao:"
                      : "Lý do từ chối:"}
                  </p>
                  <p className="mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {detailClaim.resolutionNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 p-4">
              <span className="text-[11px] sm:text-xs text-gray-500">
                Tạo lúc: {new Date(detailClaim.createdAt).toLocaleString("vi-VN")}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Actions when PENDING */}
                {detailClaim.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleOpenAction(detailClaim, "REJECT")}
                      className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleOpenAction(detailClaim, "APPROVE")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-900"
                    >
                      <CheckCircle2 size={14} />
                      Duyệt tiếp nhận
                    </button>
                  </>
                )}

                {/* Actions when APPROVED */}
                {detailClaim.status === "APPROVED" && (
                  <>
                    <button
                      onClick={() => handleOpenAction(detailClaim, "REJECT")}
                      className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      Từ chối tại quầy
                    </button>
                    <button
                      onClick={() => handleOpenAction(detailClaim, "COMPLETE")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                    >
                      <CheckCircle2 size={14} />
                      Hoàn tất sửa chữa &amp; Bàn giao
                    </button>
                  </>
                )}

                <button
                  onClick={() => setDetailClaim(null)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm sm:text-base font-black text-gray-900">
                {actionType === "APPROVE"
                  ? "Duyệt Tiếp Nhận Bảo Hành"
                  : actionType === "COMPLETE"
                  ? "Xác Nhận Hoàn Tất Bảo Hành"
                  : "Từ Chối Yêu Cầu Bảo Hành"}
              </h3>
              <button
                onClick={handleCloseAction}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Phiếu bảo hành: <strong>#{actionClaim.ticketId}</strong> — Khách hàng: <strong>{actionClaim.customerName}</strong> ({actionClaim.deviceSerialNumber})
              </p>

              {actionType === "APPROVE" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 leading-relaxed">
                  ℹ️ Khi duyệt tiếp nhận, trạng thái sẽ chuyển thành <strong>APPROVED</strong>. Hệ thống sẽ tự động gửi email thông báo khách hàng mang thiết bị đến cửa hàng để nhân viên xử lý hoàn tất.
                </div>
              )}

              {actionType === "COMPLETE" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 leading-relaxed">
                  ✅ Khách hàng đã mang thiết bị đến cửa hàng. Xác nhận nhân viên kỹ thuật đã sửa chữa / thay thế phần cứng và bàn giao lại cho khách.
                </div>
              )}

              {actionError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  {actionType === "APPROVE"
                    ? "Ghi chú & Hướng dẫn cho khách hàng (Tùy chọn)"
                    : actionType === "COMPLETE"
                    ? "Ghi chú kết quả sửa chữa / linh kiện thay thế (Bắt buộc) *"
                    : "Lý do từ chối bảo hành (Bắt buộc) *"}
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    actionType === "APPROVE"
                      ? "Nhập hướng dẫn gửi khách hàng..."
                      : actionType === "COMPLETE"
                      ? "Mô tả linh kiện đã thay thế, kết quả chạy thử nghiệm và bàn giao khách..."
                      : "Nêu rõ nguyên nhân từ chối (rách tem, vào nước, can thiệp mạch...)"
                  }
                  rows={4}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 shadow-xs focus:border-teal-700 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
                />
                <div className="mt-1 text-right text-[11px] text-gray-400">
                  {resolutionNotes.length} / 1000 ký tự
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={isProcessing}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 ${
                  actionType === "APPROVE"
                    ? "bg-teal-800 hover:bg-teal-900"
                    : actionType === "COMPLETE"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isProcessing && <Loader2 size={14} className="animate-spin" />}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            >
              <X size={20} />
            </button>
            <img
              src={previewImage}
              alt="Ảnh phóng to"
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
