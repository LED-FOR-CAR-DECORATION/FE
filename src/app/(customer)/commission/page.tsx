"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, Send, Sparkles, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DynamicCommissionFormFields from "@/features/commission/components/DynamicCommissionFormFields";
import {
  COMMISSION_BASE_PRICE,
  calculateDynamicCommissionQuote,
} from "@/features/commission/config/commissionConfigs";
import { useCommissionConfigs } from "@/features/commission/hooks/useCommissionConfigs";
import { validateCommissionSelections } from "@/features/commission/schemas";
import { saveCommissionRequest } from "@/features/commission/services/commission.service";

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

export default function CommissionPage() {
  const { user } = useAuth();
  const { configs: commissionConfigs } = useCommissionConfigs();
  const [selections, setSelections] = useState<Record<string, string | undefined>>({});
  const [note, setNote] = useState("");
  const [referenceImage, setReferenceImage] = useState<
    { name: string; dataUrl: string } | undefined
  >();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Tự động tính toán báo giá dựa trên mảng cấu hình `commissionConfigs`
  const quoteSummary = useMemo(
    () =>
      calculateDynamicCommissionQuote(
        selections,
        commissionConfigs,
        COMMISSION_BASE_PRICE
      ),
    [selections, commissionConfigs]
  );

  const handleFieldChange = (fieldKey: string, optionValue: string) => {
    setSelections((current) => ({ ...current, [fieldKey]: optionValue }));
    setError("");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCommissionSelections(selections, commissionConfigs)) {
      setError("Vui lòng chọn đầy đủ các tùy chọn bắt buộc trước khi gửi.");
      return;
    }

    const cleanedSelections: Record<string, string> = {};
    Object.entries(selections).forEach(([k, v]) => {
      if (v) cleanedSelections[k] = v;
    });

    saveCommissionRequest({
      id: `COM-${Date.now().toString(36).toUpperCase()}`,
      customerId: user?.userId ?? "guest-customer",
      customerName: user?.fullName ?? "Khách hàng MIRAGE",
      customerEmail: user?.email ?? "customer@mirage.vn",
      selections: cleanedSelections,
      note: note.trim(),
      referenceImage,
      estimatedPrice: quoteSummary.needsCustomQuote ? null : quoteSummary.total,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#f8f7ef] px-4 py-16">
          <section className="mx-auto max-w-xl rounded-xl border border-[#cfe3d0] bg-white p-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-[#198653]" size={48} />
            <h1 className="mt-4 text-2xl font-black text-[#155e59]">
              Đã gửi yêu cầu thiết kế Commission
            </h1>
            <p className="mt-3 text-sm text-[#66736b]">
              Nhân viên sẽ xem xét yêu cầu và phản hồi báo giá chi tiết cho bạn trong
              Không gian Chat.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/chat"
                className="inline-flex rounded-xl bg-[#155e59] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0e4b47]"
              >
                Mở Không gian Chat
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-xl border border-[#155e59] bg-white px-5 py-2.5 text-sm font-bold text-[#155e59] hover:bg-[#eaf5e8]"
              >
                Về trang cửa hàng
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp hình ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReferenceImage({ name: file.name, dataUrl: reader.result });
        setError("");
      }
    };
    reader.onerror = () => setError("Không thể đọc ảnh. Vui lòng thử lại.");
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f8f7ef] px-4 py-8 text-[#26352f]">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#155e59]"
          >
            <ArrowLeft size={16} /> Về cửa hàng
          </Link>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-[#155e59] uppercase">
                <Sparkles size={14} /> MIRAGE COMMISSION (DATA-DRIVEN FORM)
              </p>
              <h1 className="mt-1 text-3xl font-black text-[#155e59]">
                Yêu cầu thiết kế nhân vật Pixel Art
              </h1>
              <p className="mt-2 text-sm text-[#66736b]">
                Các tiêu chí dưới đây được tự động sinh động (Dynamic Render) từ cấu hình{" "}
                <code className="rounded bg-[#eaf5e8] px-1.5 py-0.5 font-mono text-xs font-bold text-[#155e59]">
                  commissionConfigs
                </code>{" "}
                của hệ thống.
              </p>
            </div>
            <span className="rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] px-3 py-1.5 text-xs font-bold text-[#155e59]">
              Đang hiển thị {commissionConfigs.length} tiêu chí cấu hình
            </span>
          </div>

          <form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              {/* DATA-DRIVEN RENDERING TỪ MẢNG commissionConfigs (.map() tự sinh <RadioGroup> & <select>) */}
              <DynamicCommissionFormFields
                configs={commissionConfigs}
                selections={selections}
                onSelectChange={handleFieldChange}
              />

              {/* Ảnh tham khảo */}
              <div className="rounded-xl border border-[#dce8df] bg-white p-4 shadow-sm">
                <span className="text-xs font-black text-[#155e59]">
                  Ảnh tham khảo{" "}
                  <span className="font-normal text-[#7a8c80]">(không bắt buộc)</span>
                </span>
                <span className="mt-1 block text-xs text-[#66736b]">
                  Tải lên tối đa 1 ảnh JPG, PNG hoặc WEBP, dung lượng không quá 5MB.
                </span>
                {referenceImage ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#cfe3d0] bg-[#f6fbf7] p-2">
                    <img
                      src={referenceImage.dataUrl}
                      alt="Ảnh tham khảo đã chọn"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {referenceImage.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReferenceImage(undefined)}
                      aria-label="Xóa ảnh tham khảo"
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#b7d9be] bg-[#f8fcf8] px-4 py-6 text-center transition hover:border-[#198653] hover:bg-[#edf7ef]">
                    <ImagePlus size={25} className="text-[#198653]" />
                    <span className="text-sm font-bold text-[#155e59]">
                      Chọn ảnh tham khảo
                    </span>
                    <span className="text-[11px] text-[#7a8c80]">
                      JPG, PNG, WEBP · tối đa 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => handleImageChange(event.target.files?.[0])}
                    />
                  </label>
                )}
              </div>

              {/* Ghi chú thêm */}
              <label className="block rounded-xl border border-[#dce8df] bg-white p-4 shadow-sm">
                <span className="text-xs font-black text-[#155e59]">
                  Ghi chú cho nhà thiết kế
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Mô tả thêm ý tưởng nhân vật, màu sắc chủ đạo, hiệu ứng LED mong muốn..."
                  className="mt-3 w-full resize-y rounded-xl border border-[#d4ddd5] px-3 py-2.5 text-sm outline-none focus:border-[#155e59]"
                />
              </label>
            </section>

            {/* Bảng tóm tắt báo giá tự động cập nhật theo các tùy chọn trong commissionConfigs */}
            <aside className="h-fit rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] p-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-black text-[#155e59]">Tóm tắt báo giá</h2>

              <div className="mt-4 flex items-center justify-between border-b border-[#cfe3d0] pb-3 text-sm">
                <span>Giá cơ bản</span>
                <strong>{formatMoney(quoteSummary.basePrice)}</strong>
              </div>

              {/* Danh sách chi tiết các tùy chọn đã chọn được render động */}
              {quoteSummary.breakdown.length > 0 && (
                <div className="mt-3 space-y-2 border-b border-[#cfe3d0] pb-3 text-xs">
                  <p className="font-bold text-[#155e59] uppercase">
                    Tùy chọn đã chọn ({quoteSummary.breakdown.length}/
                    {commissionConfigs.length})
                  </p>
                  {quoteSummary.breakdown.map((item) => (
                    <div
                      key={item.fieldKey}
                      className="flex items-start justify-between gap-2 text-[#486355]"
                    >
                      <span className="min-w-0 flex-1">
                        <strong className="text-[#155e59]">{item.fieldName}:</strong>{" "}
                        {item.optionLabel}
                      </span>
                      <span className="shrink-0 font-bold text-[#155e59]">
                        {item.price === null
                          ? "Báo giá sau"
                          : item.price > 0
                          ? `+${formatMoney(item.price)}`
                          : "+0 đ"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Tổng phụ phí tùy chọn</span>
                <strong>{formatMoney(quoteSummary.surchargeTotal)}</strong>
              </div>

              <div className="mt-4 border-t border-[#cfe3d0] pt-4">
                <p className="text-xs text-[#66736b]">Chi phí dự kiến</p>
                <p className="mt-1 text-2xl font-black text-[#155e59]">
                  {quoteSummary.needsCustomQuote
                    ? `Từ ${formatMoney(quoteSummary.total)} (Cần báo giá thêm)`
                    : formatMoney(quoteSummary.total)}
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#155e59] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0e4b47]"
              >
                <Send size={16} /> Gửi yêu cầu Commission
              </button>
              <p className="mt-3 text-center text-[11px] text-[#66736b]">
                Báo giá cuối cùng sẽ được nhân viên xác nhận tại Không gian Chat.
              </p>
            </aside>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
