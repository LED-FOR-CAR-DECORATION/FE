"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CustomerDeviceItem } from "@/api_client/models/CustomerDeviceItem";
import {
  createWarrantyClaim,
  getCustomerDevices,
  getCustomerDeviceWarranty,
  WARRANTY_CHANGED_EVENT,
  type CustomerWarrantyResponse,
  type WarrantyClaimItem,
  type WarrantyTicketStatus,
} from "@/lib/api/warranty";
import { uploadMediaFile } from "@/lib/api/media";

const STATUS_CONFIG: Record<
  WarrantyTicketStatus,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Đang chờ duyệt",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    icon: Clock,
  },
  APPROVED: {
    label: "Đã duyệt - Vui lòng mang đến cửa hàng",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    icon: Store,
  },
  REJECTED: {
    label: "Từ chối tiếp nhận",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
    icon: ShieldAlert,
  },
  COMPLETED: {
    label: "Đã xử lý hoàn tất",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: CheckCircle2,
  },
};

export default function CustomerWarrantyPage() {
  const { user } = useAuth();

  const [devices, setDevices] = useState<CustomerDeviceItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [warrantyData, setWarrantyData] = useState<CustomerWarrantyResponse | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isLoadingWarranty, setIsLoadingWarranty] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [warrantyError, setWarrantyError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Claim modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  // objectKey: gửi lên BE (WARRANTY_EVIDENCE là media private, không có publicUrl); previewUrl: blob local để xem trước
  const [uploadedEvidence, setUploadedEvidence] = useState<{ objectKey: string; previewUrl: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load real customer devices from API
  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setDevicesError(null);
    try {
      const items = await getCustomerDevices();
      setDevices(items);
      if (items.length > 0) {
        setSelectedDeviceId((prev) => (prev ? prev : items[0].deviceId ?? null));
      }
    } catch (err: any) {
      setDevicesError(err.message || "Không thể tải danh sách thiết bị từ hệ thống.");
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  // Load warranty data & claims history for selected device
  const loadDeviceWarranty = useCallback(async (devId: number) => {
    setIsLoadingWarranty(true);
    setWarrantyError(null);
    try {
      const data = await getCustomerDeviceWarranty(devId);
      setWarrantyData(data);
    } catch (err: any) {
      setWarrantyError(err.message || "Không thể tải thông tin bảo hành.");
    } finally {
      setIsLoadingWarranty(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (selectedDeviceId) {
      loadDeviceWarranty(selectedDeviceId);
    }
  }, [selectedDeviceId, loadDeviceWarranty]);

  // Sync when warranty claims change
  useEffect(() => {
    const handleWarrantyChange = () => {
      if (selectedDeviceId) {
        loadDeviceWarranty(selectedDeviceId);
      }
    };
    window.addEventListener(WARRANTY_CHANGED_EVENT, handleWarrantyChange);
    return () => {
      window.removeEventListener(WARRANTY_CHANGED_EVENT, handleWarrantyChange);
    };
  }, [selectedDeviceId, loadDeviceWarranty]);

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);

  // Check if device already has an active claim (PENDING or APPROVED)
  const activeClaim =
    warrantyData?.activeTicket ||
    warrantyData?.claims?.find(
      (c) => c.status === "PENDING" || c.status === "APPROVED"
    );

  const canCreateClaim =
    (selectedDevice?.warrantyStatus === "ACTIVE" || warrantyData?.warrantyStatus === "ACTIVE") &&
    !activeClaim;

  // Handle image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedEvidence.length + files.length > 5) {
      setFormError("Chỉ được đính kèm tối đa 5 hình ảnh bằng chứng.");
      return;
    }

    setIsUploading(true);
    setFormError(null);

    try {
      const newEvidence: { objectKey: string; previewUrl: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          setFormError(`Tệp ${file.name} không phải là hình ảnh.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          setFormError(`Hình ảnh ${file.name} vượt quá kích thước tối đa 10MB.`);
          continue;
        }

        try {
          const res = await uploadMediaFile(
            file,
            "WARRANTY_EVIDENCE",
            selectedDeviceId ?? undefined
          );
          if (!res.objectKey) {
            throw new Error("Không nhận được mã ảnh bằng chứng");
          }
          newEvidence.push({
            objectKey: res.objectKey,
            previewUrl: res.localPreviewUrl ?? "",
          });
        } catch (uploadErr: any) {
          setFormError(
            `Không thể tải ảnh lên (${uploadErr.message || "Lỗi máy chủ lưu trữ"}). Bạn vẫn có thể gửi yêu cầu bảo hành bình thường với phần mô tả lỗi mà không cần đính kèm ảnh.`
          );
        }
      }
      setUploadedEvidence((prev) => [...prev, ...newEvidence].slice(0, 5));
    } catch {
      setFormError("Tải ảnh lên thất bại. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeUploadedImage = (indexToRemove: number) => {
    setUploadedEvidence((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) return;

    const trimmed = issueDescription.trim();
    if (trimmed.length < 10) {
      setFormError("Mô tả lỗi phải có ít nhất 10 ký tự.");
      return;
    }
    if (trimmed.length > 1000) {
      setFormError("Mô tả lỗi không được vượt quá 1000 ký tự.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const newClaim = await createWarrantyClaim(selectedDeviceId, {
        issueDescription: trimmed,
        evidenceMediaUrls: uploadedEvidence.map((item) => item.objectKey),
      });

      setFormSuccess(
        `Gửi yêu cầu bảo hành thành công! Mã phiếu của bạn là #${newClaim.ticketId}. Quản lý sẽ tiếp nhận xét duyệt và gửi email hướng dẫn bạn mang máy đến cửa hàng.`
      );
      setIssueDescription("");
      setUploadedEvidence([]);
      setIsModalOpen(false);
      await loadDeviceWarranty(selectedDeviceId);
    } catch (err: any) {
      setFormError(err.message || "Không thể gửi yêu cầu bảo hành. Vui lòng kiểm tra lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <Header />

      <main className="flex-1 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Sidebar */}
            <CustomerSidebar />

            {/* Content Area */}
            <div className="min-w-0 flex-1">
              {/* Header Title Banner */}
              <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-emerald-50 to-white p-4 sm:p-6 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[#155e59] text-white shadow-xs">
                      <ShieldCheck size={26} />
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-gray-900 sm:text-2xl">
                        Bảo Hành Thiết Bị Phần Cứng
                      </h1>
                      <p className="mt-0.5 text-xs sm:text-sm text-gray-600">
                        Chính sách bảo hành 180 ngày cho toàn bộ phần cứng đèn LED ma trận kể từ ngày kích hoạt.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedDeviceId) loadDeviceWarranty(selectedDeviceId);
                      else loadDevices();
                    }}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
                  >
                    <RefreshCw size={14} className={isLoadingWarranty || isLoadingDevices ? "animate-spin" : ""} />
                    Làm mới
                  </button>
                </div>
              </div>

              {/* Success Message Banner */}
              {formSuccess && (
                <div className="mt-4 flex items-start justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-800">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-bold">Đã gửi yêu cầu bảo hành thành công!</p>
                      <p className="mt-0.5 text-xs">{formSuccess}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormSuccess(null)}
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Devices Error */}
              {devicesError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-bold">Không thể tải thiết bị</p>
                    <p className="mt-0.5 text-xs">{devicesError}</p>
                  </div>
                </div>
              )}

              {/* Device Selector Section */}
              <div className="mt-6">
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">
                    Thiết bị của bạn ({devices.length})
                  </h2>
                  <span className="text-xs text-gray-500">
                    Chọn thiết bị để xem thời hạn bảo hành và lịch sử yêu cầu
                  </span>
                </div>

                {isLoadingDevices ? (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <Loader2 size={24} className="animate-spin text-[#155e59]" />
                    <span className="ml-2 text-sm text-gray-500">Đang tải danh sách thiết bị...</span>
                  </div>
                ) : devices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 sm:p-8 text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      Bạn chưa có thiết bị LED nào được liên kết với tài khoản.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Vui lòng quét mã QR trên hộp đèn LED hoặc thân thiết bị để liên kết và kích hoạt bảo hành 180 ngày.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {devices.map((device) => {
                      const isSelected = device.deviceId === selectedDeviceId;
                      const isExpired = device.warrantyStatus === "EXPIRED";
                      const isNotActivated = device.warrantyStatus === "NOT_ACTIVATED";

                      return (
                        <div
                          key={device.deviceId}
                          onClick={() => device.deviceId && setSelectedDeviceId(device.deviceId)}
                          className={`relative cursor-pointer rounded-xl border p-3.5 sm:p-4 transition-all ${
                            isSelected
                              ? "border-[#155e59] bg-teal-50/40 ring-2 ring-[#155e59] shadow-sm"
                              : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-xs sm:text-sm font-bold text-gray-900">
                              {device.deviceName || `Thiết bị #${device.deviceId}`}
                            </span>
                            {isSelected && (
                              <span className="rounded-full bg-[#155e59] px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
                                Đang chọn
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs font-mono text-gray-500 truncate">
                            SN: {device.serialNumber || "—"}
                          </p>
                          <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                            {device.modelName || `Ma trận ${device.widthPx || 64}x${device.heightPx || 32}`}
                          </p>

                          {/* Warranty status badge */}
                          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                            <span className="text-gray-500 text-[11px]">Bảo hành:</span>
                            {isNotActivated ? (
                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-700">
                                Chưa kích hoạt
                              </span>
                            ) : isExpired ? (
                              <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-gray-600">
                                Hết hạn
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700">
                                Đang hiệu lực
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Device Details & Warranty Claims */}
              {selectedDevice && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                  {/* Top info and action */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-gray-900">
                          {selectedDevice.deviceName || `Thiết bị #${selectedDevice.deviceId}`}
                        </h2>
                        {warrantyData?.warrantyStatus === "ACTIVE" || selectedDevice.warrantyStatus === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-emerald-700">
                            <ShieldCheck size={13} />
                            Đang bảo hành ({warrantyData?.remainingDays ?? warrantyData?.remainingWarrantyDays ?? 180} ngày còn lại)
                          </span>
                        ) : selectedDevice.warrantyStatus === "NOT_ACTIVATED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-amber-700">
                            <AlertTriangle size={13} />
                            Chưa quét mã QR kích hoạt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-gray-600">
                            <Clock size={13} />
                            Đã hết hạn bảo hành
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500 font-mono flex flex-wrap gap-x-3 gap-y-1">
                        <span>Số Serial: <strong className="text-gray-700">{warrantyData?.serialNumber || selectedDevice.serialNumber}</strong></span>
                        {selectedDevice.boundAt && (
                          <span className="font-sans">
                            Kích hoạt: {new Date(selectedDevice.boundAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        {(selectedDevice.warrantyExpiresAt || warrantyData?.warrantyExpiresAt) && (
                          <span className="font-sans">
                            Hết hạn: {new Date(selectedDevice.warrantyExpiresAt || warrantyData?.warrantyExpiresAt!).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Button Create Claim */}
                    <div className="w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setIsModalOpen(true);
                        }}
                        disabled={!canCreateClaim}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition ${
                          canCreateClaim
                            ? "bg-[#155e59] text-white hover:bg-[#114b47]"
                            : "cursor-not-allowed bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Plus size={16} />
                        Gửi Yêu Cầu Bảo Hành
                      </button>
                    </div>
                  </div>

                  {/* Warning banner if claim already exists */}
                  {activeClaim && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900">
                      <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-blue-950">
                          Thiết bị đang có yêu cầu bảo hành #{activeClaim.ticketId} ({STATUS_CONFIG[activeClaim.status]?.label})
                        </p>
                        <p className="mt-0.5 text-blue-800 leading-relaxed">
                          {activeClaim.status === "APPROVED"
                            ? "Yêu cầu của bạn đã được duyệt tiếp nhận! Quý khách vui lòng mang thiết bị đến cửa hàng Lumintra gần nhất và cung cấp mã phiếu để nhân viên kỹ thuật hoàn thành bảo hành."
                            : "Yêu cầu bảo hành đang chờ quản lý xét duyệt. Bạn vui lòng theo dõi cập nhật trạng thái phiếu bên dưới."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Claims History List */}
                  <div className="mt-6">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-500">
                      Lịch sử yêu cầu bảo hành của thiết bị ({warrantyData?.claims?.length || 0})
                    </h3>

                    {warrantyError && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" />
                        <span>{warrantyError}</span>
                      </div>
                    )}

                    {isLoadingWarranty ? (
                      <div className="flex h-24 items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-[#155e59]" />
                        <span className="ml-2 text-xs text-gray-500">Đang tải lịch sử bảo hành...</span>
                      </div>
                    ) : !warrantyData?.claims || warrantyData.claims.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                        Chưa có phiếu bảo hành nào được tạo cho thiết bị này.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3.5">
                        {warrantyData.claims.map((claim) => {
                          const config = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
                          const StatusIcon = config.icon;

                          return (
                            <div
                              key={claim.ticketId}
                              className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 sm:p-4 transition hover:border-gray-300"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-black text-gray-900">
                                    #{claim.ticketId}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] sm:text-xs font-bold ${config.badgeClass}`}
                                  >
                                    <StatusIcon size={12} />
                                    {config.label}
                                  </span>
                                </div>
                                <span className="text-[11px] sm:text-xs text-gray-500">
                                  Tạo lúc: {new Date(claim.createdAt).toLocaleString("vi-VN")}
                                </span>
                              </div>

                              {/* Issue Description */}
                              <div className="mt-2.5">
                                <p className="text-[11px] font-semibold text-gray-600">Mô tả sự cố:</p>
                                <p className="mt-1 rounded-lg border border-gray-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {claim.issueDescription}
                                </p>
                              </div>

                              {/* Evidence Media Preview */}
                              {claim.evidenceMediaUrls && claim.evidenceMediaUrls.length > 0 && (
                                <div className="mt-2.5">
                                  <p className="text-[11px] font-semibold text-gray-600">
                                    Hình ảnh bằng chứng ({claim.evidenceMediaUrls.length}):
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-2">
                                    {claim.evidenceMediaUrls.map((url, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => setPreviewImage(url)}
                                        className="group relative h-14 w-14 sm:h-16 sm:w-16 cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shrink-0"
                                      >
                                        <img
                                          src={url}
                                          alt={`Bằng chứng ${idx + 1}`}
                                          className="h-full w-full object-cover transition group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                                          <Eye size={14} className="text-white" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Staff / Manager Resolution Notes */}
                              {claim.resolutionNotes && (
                                <div
                                  className={`mt-3 rounded-xl border p-3 text-xs ${
                                    claim.status === "APPROVED"
                                      ? "border-blue-300 bg-blue-50 text-blue-900"
                                      : claim.status === "COMPLETED"
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                      : "border-red-300 bg-red-50 text-red-900"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 font-bold">
                                    {claim.status === "APPROVED" && <Store size={14} />}
                                    {claim.status === "COMPLETED" && <CheckCircle2 size={14} />}
                                    {claim.status === "REJECTED" && <ShieldAlert size={14} />}
                                    <span>
                                      {claim.status === "APPROVED"
                                        ? "Hướng dẫn từ Quản lý / Cửa hàng:"
                                        : claim.status === "COMPLETED"
                                        ? "Kết quả xử lý từ nhân viên kỹ thuật:"
                                        : "Lý do từ chối bảo hành:"}
                                    </span>
                                  </div>
                                  <p className="mt-1 leading-relaxed whitespace-pre-wrap text-xs">
                                    {claim.resolutionNotes}
                                  </p>

                                  {claim.status === "APPROVED" && (
                                    <div className="mt-2 rounded-lg border border-blue-200 bg-white/90 p-2 font-medium text-blue-950 text-[11px] sm:text-xs">
                                      📍 <strong>Địa chỉ tiếp nhận:</strong> Trung tâm Trải nghiệm &amp; Bảo hành Lumintra — Khách hàng vui lòng mang theo thiết bị và cung cấp mã phiếu <strong>#{claim.ticketId}</strong> cho nhân viên tại quầy.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Tạo phiếu bảo hành mới */}
      {isModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  Tạo Phiếu Yêu Cầu Bảo Hành
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Thiết bị: <strong className="text-gray-800">{selectedDevice.deviceName}</strong> ({selectedDevice.serialNumber})
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="mt-4 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Issue Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Mô tả chi tiết sự cố phần cứng <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Mô tả cụ thể biểu hiện lỗi: mất đèn hàng nào, có chập chờn hay không, xảy ra khi nào (tối thiểu 10 ký tự)..."
                  rows={4}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 text-xs sm:text-sm text-gray-900 shadow-xs focus:border-[#155e59] focus:outline-hidden focus:ring-1 focus:ring-[#155e59]"
                />
                <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                  <span>Tối thiểu 10 ký tự</span>
                  <span>{issueDescription.length} / 1000 ký tự</span>
                </div>
              </div>

              {/* Upload Evidence Images */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Ảnh bằng chứng lỗi (Tối đa 5 ảnh)
                </label>
                <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500">
                  Đính kèm ảnh chụp màn hình LED bị lỗi hoặc tem sản phẩm để kỹ thuật viên kiểm tra nhanh hơn.
                </p>

                {/* Uploaded previews */}
                {uploadedEvidence.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {uploadedEvidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="group relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shrink-0"
                      >
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(idx)}
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {uploadedEvidence.length < 5 && (
                  <label
                    className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-3 text-xs font-semibold text-gray-600 transition hover:border-[#155e59] hover:bg-teal-50/30 ${
                      isUploading ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-[#155e59]" />
                        <span>Đang tải ảnh lên Cloud...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} className="text-[#155e59]" />
                        <span>Chọn ảnh tải lên từ thiết bị</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || issueDescription.trim().length < 10}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#155e59] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#114b47] disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                  Gửi Yêu Cầu
                </button>
              </div>
            </form>
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

      <Footer />
    </div>
  );
}
