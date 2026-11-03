"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  ImagePlus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  RefreshCw,
  X,
  CreditCard,
  Check,
  Clock,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useCommissionChat } from "../hooks/useCommissionChat";
import { formatVND, formatVNDFull } from "../services/commission-chat.service";
import type { ChatMessage, ProgressStep } from "../types";
import WatermarkedPixelPreview from "./WatermarkedPixelPreview";

export default function CustomerCommissionChat() {
  const {
    conversations,
    activeConversation,
    setActiveConvId,
    updateActiveConversation,
  } = useCommissionChat();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageInput, setMessageInput] = useState<string>("");

  // Modal Yêu cầu sửa (+10% phí) - Revision Paywall Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionNote, setRevisionNote] = useState<string>("");
  const [revisionError, setRevisionError] = useState<string>("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation.messages.length, activeConversation.id]);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.commission.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Khách hàng gửi tin nhắn
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "CUSTOMER",
      text: trimmed,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      lastMessage: trimmed,
      lastTime: "Vừa xong",
      messages: [...conv.messages, newMsg],
    }));

    setMessageInput("");
  };

  // Khách hàng đính kèm ảnh tham khảo
  const handleAttachImage = () => {
    const newMsg: ChatMessage = {
      id: `msg-img-${Date.now()}`,
      sender: "CUSTOMER",
      text: "Mình gửi thêm hình ảnh tham khảo ý tưởng nhân vật và bảng màu mong muốn nhé!",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      lastMessage: newMsg.text!,
      lastTime: "Vừa xong",
      messages: [...conv.messages, newMsg],
    }));

    showToast("Đã gửi hình ảnh tham khảo vào cuộc trò chuyện!");
  };

  // Khách hàng bấm [Thanh toán ngay] trên Thẻ báo giá (System Action Card)
  const handlePayCommission = (quotePrice?: number) => {
    const paidAmount = quotePrice ?? activeConversation.commission.price;
    const confirmMsg: ChatMessage = {
      id: `msg-pay-${Date.now()}`,
      sender: "CUSTOMER",
      text: `Mình đã thanh toán đơn Commission "${activeConversation.commission.characterName}" (${formatVND(paidAmount)}).`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      orderState: conv.orderState === "NO_ORDER" ? "IN_PROGRESS" : conv.orderState,
      progressStep: conv.progressStep === "WAITING_PAYMENT" ? "DRAWING" : conv.progressStep,
      commission: { ...conv.commission, isPaid: true },
      lastMessage: confirmMsg.text!,
      lastTime: "Vừa xong",
      messages: conv.messages
        .map((m) => (m.quoteCard ? { ...m, quoteCard: { ...m.quoteCard, isPaid: true } } : m))
        .concat(confirmMsg),
    }));

    showToast(`Thanh toán thành công ${formatVND(paidAmount)}!`);
  };

  // Khách hàng bấm [ Phê duyệt & Tải file gốc ]
  const handleApproveAndDownload = () => {
    const doneMsg: ChatMessage = {
      id: `msg-approve-${Date.now()}`,
      sender: "CUSTOMER",
      text: `Mình đã phê duyệt bản vẽ "${activeConversation.commission.characterName}" và tải xuống file gốc. Cảm ơn MIRAGE!`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      commission: { ...conv.commission, isApproved: true },
      lastMessage: "Khách hàng đã phê duyệt & tải file gốc.",
      lastTime: "Vừa xong",
      messages: [...conv.messages, doneMsg],
    }));

    showToast(
      "Phê duyệt thành công! Đang tải xuống file gốc chất lượng cao (đã gỡ Watermark)..."
    );
  };

  // Logic tính phí chỉnh sửa 10% trong Revision Paywall Modal
  const baseOrderPrice = activeConversation.commission.price || 500000;
  const revisionFee = Math.round(baseOrderPrice * 0.1); // 50.000 VNĐ (10% của 500.000 VNĐ)

  const handleSubmitRevisionPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      setRevisionError("Vui lòng nhập nội dung bạn muốn yêu cầu chỉnh sửa.");
      return;
    }

    const revisionMsg: ChatMessage = {
      id: `msg-rev-${Date.now()}`,
      sender: "CUSTOMER",
      text: `[Yêu cầu chỉnh sửa - Đã thanh toán phụ phí 10% (${formatVND(revisionFee)})]: ${revisionNote.trim()}`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      orderState: "IN_PROGRESS",
      progressStep: "DRAWING",
      lastMessage: `Yêu cầu chỉnh sửa (+${formatVND(revisionFee)}): ${revisionNote.trim()}`,
      lastTime: "Vừa xong",
      messages: [...conv.messages, revisionMsg],
    }));

    setRevisionNote("");
    setRevisionError("");
    setIsRevisionModalOpen(false);
    showToast(`Đã thanh toán ${formatVND(revisionFee)} và gửi yêu cầu chỉnh sửa thành công!`);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8f7ef] text-[#26352f]">
      {/* Thanh điều hướng ngang của Customer (chứa nút "Chat ngay") */}
      <Header />

      {/* CORE LAYOUT 3 CỘT KIỂU ZALO PC BÊN DƯỚI HEADER (25% - 50% - 25%) */}
      <main className="flex min-h-0 flex-1 gap-3 overflow-hidden bg-[#f8f7ef] p-3">
        {/* ===================================================================
            CỘT 1: DANH SÁCH HỘI THOẠI (25% CHIỀU RỘNG - CỘT TRÁI)
        =================================================================== */}
        <section className="flex w-1/4 min-w-[260px] flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
          <div className="border-b border-[#e4efe6] bg-[#eaf5e8] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <h1 className="text-sm font-black text-[#155e59]">Hội thoại của tôi</h1>
              <span className="rounded-full bg-[#155e59] px-2.5 py-0.5 text-[10px] font-bold text-white">
                {conversations.length} đơn
              </span>
            </div>

            {/* Thanh tìm kiếm hội thoại */}
            <div className="relative flex items-center">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 text-[#66736b]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân viên hỗ trợ, tên nhân vật..."
                className="w-full rounded-xl border border-[#cfe3d0] bg-[#fffdf9] py-2 pr-3 pl-9 text-xs text-[#26352f] outline-none placeholder:text-[#7a8c80] focus:border-[#155e59] focus:ring-2 focus:ring-[#8fc7a0]/40"
              />
            </div>
          </div>

          {/* Danh sách hội thoại */}
          <div className="flex-1 space-y-1 divide-y divide-[#f0f5f1] overflow-y-auto p-2">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation.id;
              const badge =
                conv.orderState === "REVIEW"
                  ? { label: "Chờ nghiệm thu", cls: "bg-amber-100 text-amber-800" }
                  : conv.orderState === "IN_PROGRESS"
                  ? { label: "Đang thực hiện", cls: "bg-[#dcebd4] text-[#155e59]" }
                  : { label: "Đang tư vấn", cls: "bg-gray-100 text-gray-600" };

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConvId(conv.id)}
                  className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                    isActive
                      ? "border border-[#8fc7a0] bg-[#edf7ef] shadow-xs"
                      : "border border-transparent hover:bg-[#f8fbf8]"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-black ${
                        isActive
                          ? "bg-[#155e59] text-white"
                          : "bg-[#dcebd4] text-[#155e59]"
                      }`}
                    >
                      {conv.staffAvatar}
                    </div>
                    {conv.online && (
                      <span
                        className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                        title="Đang trực tuyến"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-extrabold text-[#155e59]">
                        {conv.staffName}
                      </p>
                      <span className="shrink-0 text-[10px] font-medium text-[#7a8c80]">
                        {conv.lastTime}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-1 text-xs text-[#54655c]">
                      {conv.lastMessage}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="truncate text-[10px] font-semibold text-[#66736b]">
                        #{conv.commission.characterName}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            CỘT 2: KHUNG CHAT CHÍNH (50% CHIỀU RỘNG - CỘT GIỮA)
        =================================================================== */}
        <section className="flex w-2/4 flex-1 flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
          {/* Header hiển thị thông tin người đang chat */}
          <div className="flex items-center justify-between border-b border-[#cfe3d0] bg-[#eaf5e8] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#155e59] text-xs font-black text-white">
                  {activeConversation.staffAvatar}
                </div>
                {activeConversation.online && (
                  <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-black text-[#155e59]">
                  {activeConversation.staffName}
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-[#4b6758]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      activeConversation.online ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                  {activeConversation.online
                    ? "Đang trực tuyến • Hỗ trợ chốt đơn Commission"
                    : "Ngoại tuyến"}
                </p>
              </div>
            </div>

            <span className="rounded-xl border border-[#b7d9be] bg-[#fffdf7] px-3 py-1.5 text-xs font-bold text-[#155e59]">
              Nhân vật: {activeConversation.commission.characterName}
            </span>
          </div>

          {/* Vùng hiển thị tin nhắn (Chat timeline) */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfaf4] p-5">
            {activeConversation.messages.map((msg) => {
              // System Action Card: Thẻ báo giá chèn vào timeline
              if (msg.sender === "SYSTEM" && msg.quoteCard) {
                const card = msg.quoteCard;
                return (
                  <div key={msg.id} className="my-3 flex justify-center">
                    <div className="w-full max-w-md overflow-hidden rounded-xl border-2 border-[#8fc7a0] bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-[#dce8df] bg-[#eaf5e8] px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-black text-[#155e59]">
                          <Sparkles size={14} />
                          THẺ BÁO GIÁ COMMISSION PIXEL ART
                        </span>
                        <span className="text-[11px] font-semibold text-[#5a7365]">
                          {msg.time}
                        </span>
                      </div>

                      <div className="space-y-3 p-4">
                        <p className="text-sm font-extrabold text-[#155e59]">
                          Nhân viên đã tạo một yêu cầu: {card.characterName} -{" "}
                          {formatVND(card.price)}
                        </p>

                        <div className="space-y-1.5 rounded-xl border border-[#e6efe8] bg-[#f8f7ef] p-3 text-xs">
                          <p className="text-[#495e52]">
                            <strong className="text-[#155e59]">Mô tả:</strong>{" "}
                            {card.description}
                          </p>
                          <div className="flex items-center justify-between border-t border-[#e2e8e3] pt-1.5">
                            <span className="text-[#66736b]">Ngày giao dự kiến:</span>
                            <strong className="text-[#155e59]">{card.deliveryDate}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#66736b]">Chi phí:</span>
                            <strong className="text-sm font-black text-[#155e59]">
                              {formatVND(card.price)}
                            </strong>
                          </div>
                        </div>

                        {card.isPaid ? (
                          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 size={15} />
                            Đã thanh toán ({formatVND(card.price)})
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePayCommission(card.price)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#155e59] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743] cursor-pointer"
                          >
                            <CreditCard size={15} />
                            Thanh toán ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Bong bóng chat của Customer (bên phải) và Staff (bên trái)
              const isCustomer = msg.sender === "CUSTOMER";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCustomer ? "items-end" : "items-start"
                  }`}
                >
                  <span className="mb-1 px-1 text-[10px] font-semibold text-[#7a8c80]">
                    {isCustomer ? "Bạn" : activeConversation.staffName} • {msg.time}
                  </span>
                  <div
                    className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                      isCustomer
                        ? "bg-[#155e59] text-white"
                        : "border border-[#dce8df] bg-white text-[#26352f]"
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Vùng nhập liệu (Input area) */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2.5 border-t border-[#dce8df] bg-white p-3.5"
          >
            <button
              type="button"
              onClick={handleAttachImage}
              title="Đính kèm ảnh tham khảo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cfe3d0] bg-[#f8f7ef] text-[#155e59] transition hover:bg-[#eaf5e8]"
            >
              <ImagePlus size={18} />
            </button>

            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Nhập tin nhắn trao đổi ý tưởng nhân vật Pixel Art..."
              className="flex-1 rounded-xl border border-[#cfe3d0] bg-[#f8f7ef] px-4 py-2.5 text-sm text-[#26352f] outline-none placeholder:text-[#7a8c80] focus:border-[#155e59] focus:bg-white focus:ring-2 focus:ring-[#8fc7a0]/40"
            />

            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#155e59] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743]"
            >
              <Send size={15} />
              <span>Gửi</span>
            </button>
          </form>
        </section>

        {/* ===================================================================
            CỘT 3: BẢNG THÔNG TIN & NGHIỆM THU ĐƠN VẼ (DÀNH CHO CUSTOMER - 25%)
        =================================================================== */}
        <aside className="flex w-1/4 min-w-[270px] flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
          <div className="border-b border-[#cfe3d0] bg-[#eaf5e8] px-4 py-3.5">
            <h2 className="text-sm font-black text-[#155e59]">
              Thông tin & Tiến độ đơn vẽ
            </h2>
            <p className="mt-0.5 text-[11px] text-[#546d5e]">
              Theo dõi trạng thái và nghiệm thu tác phẩm Commission
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Khi đơn chưa được nhân viên tạo báo giá */}
            {activeConversation.orderState === "NO_ORDER" && (
              <div className="rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-5 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf5e8] text-[#155e59]">
                  <Clock size={22} />
                </div>
                <h3 className="text-sm font-black text-[#155e59]">
                  Đang chờ nhân viên tạo báo giá
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#66736b]">
                  Hãy trao đổi chi tiết ý tưởng nhân vật ở khung chat bên cạnh. Nhân viên
                  MIRAGE sẽ gửi Thẻ báo giá Commission cho bạn ngay sau khi thống nhất.
                </p>
              </div>
            )}

            {/* STATE 2: ĐANG THỰC HIỆN (IN_PROGRESS) */}
            {activeConversation.orderState === "IN_PROGRESS" && (
              <div className="space-y-4">
                <div className="space-y-2 rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#66736b] uppercase">
                      Thông tin đơn vẽ
                    </span>
                    <span className="rounded-md bg-[#dcebd4] px-2 py-0.5 text-[10px] font-black text-[#155e59]">
                      Đang thực hiện
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#155e59]">
                    {activeConversation.commission.characterName}
                  </h3>
                  <p className="text-xs text-[#54655c]">
                    {activeConversation.commission.description}
                  </p>
                  <div className="flex items-center justify-between border-t border-[#e2e8e3] pt-2 text-xs">
                    <span className="text-[#66736b]">Giá trị đơn:</span>
                    <strong className="text-sm font-black text-[#155e59]">
                      {formatVND(activeConversation.commission.price)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#66736b]">Ngày giao dự kiến:</span>
                    <strong className="text-[#26352f]">
                      {activeConversation.commission.deliveryDate}
                    </strong>
                  </div>
                </div>

                {/* Trạng thái tiến độ đơn vẽ */}
                <div className="rounded-xl border border-[#dce8df] bg-white p-4 shadow-xs">
                  <h4 className="mb-3 text-xs font-black text-[#155e59] uppercase">
                    Tiến độ đơn vẽ
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        key: "WAITING_PAYMENT" as ProgressStep,
                        label: "Chờ thanh toán",
                        desc: "Xác nhận báo giá và thanh toán đơn vẽ",
                      },
                      {
                        key: "DRAWING" as ProgressStep,
                        label: "Đang vẽ",
                        desc: "Artist đang thực hiện bản vẽ Pixel Art",
                      },
                      {
                        key: "REVIEWING" as ProgressStep,
                        label: "Đang nghiệm thu",
                        desc: "Nhận bản Preview và duyệt file gốc",
                      },
                    ].map((step, index) => {
                      const order: ProgressStep[] = [
                        "WAITING_PAYMENT",
                        "DRAWING",
                        "REVIEWING",
                      ];
                      const currentIdx = order.indexOf(activeConversation.progressStep);
                      const isDone = index < currentIdx;
                      const isCurrent = index === currentIdx;

                      return (
                        <div
                          key={step.key}
                          className={`flex items-start gap-3 rounded-xl border p-3 ${
                            isCurrent
                              ? "border-[#155e59] bg-[#eaf5e8]"
                              : isDone
                              ? "border-[#cfe3d0] bg-[#f8fbf8]"
                              : "border-[#e6ece7] bg-white opacity-60"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              isDone
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                ? "bg-[#155e59] text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {isDone ? <Check size={13} /> : index + 1}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-[#155e59]">
                              {step.label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#5c7065]">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STATE 3: NGHIỆM THU - KHÁCH HÀNG NHẬN FILE (REVIEW) */}
            {activeConversation.orderState === "REVIEW" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#8fc7a0] bg-[#eaf5e8] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#155e59]">
                      Nghiệm thu bàn giao
                    </span>
                    <span className="rounded-full bg-[#155e59] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {activeConversation.commission.isApproved
                        ? "Đã phê duyệt"
                        : "Có Watermark"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#486355]">
                    Đơn vẽ:{" "}
                    <strong>{activeConversation.commission.characterName}</strong> •{" "}
                    <strong>{formatVND(activeConversation.commission.price)}</strong>
                  </p>
                </div>

                {/* Hiển thị ảnh Preview (có watermark) */}
                <WatermarkedPixelPreview
                  characterName={activeConversation.commission.characterName}
                  isApproved={activeConversation.commission.isApproved}
                />

                <div className="rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3 text-xs text-[#54655c]">
                  <p>
                    <strong className="text-[#155e59]">Hướng dẫn nghiệm thu:</strong> Ảnh
                    xem trước đang được gắn <em>Watermark</em> bảo vệ bản quyền. Hãy chọn{" "}
                    <strong>Phê duyệt</strong> để tải file gốc hoặc{" "}
                    <strong>Yêu cầu sửa</strong> nếu cần điều chỉnh chi tiết.
                  </p>
                </div>

                {/* Bên dưới có 2 nút dành riêng cho Khách hàng */}
                <div className="space-y-2.5 pt-1">
                  {/* Nút Xanh: [ Phê duyệt & Tải file gốc ] */}
                  <button
                    type="button"
                    onClick={handleApproveAndDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#155e59] px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#0f4743] cursor-pointer"
                  >
                    <Download size={16} />
                    Phê duyệt & Tải file gốc
                  </button>

                  {/* Nút Đỏ/Cam: [ Yêu cầu sửa (+10% phí) ] */}
                  <button
                    type="button"
                    onClick={() => {
                      setRevisionError("");
                      setIsRevisionModalOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300 bg-[#ea580c] px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#c2410c] cursor-pointer"
                  >
                    <RefreshCw size={15} />
                    Yêu cầu sửa (+10% phí)
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* =====================================================================
          BUSINESS LOGIC: REVISION PAYWALL MODAL (CHẶN LẠI KHI YÊU CẦU SỬA)
      ===================================================================== */}
      {isRevisionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revision-modal-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#cfe3d0] bg-[#fffdf9] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cfe3d0] bg-[#eaf5e8] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <AlertTriangle size={19} />
                </div>
                <div>
                  <h3
                    id="revision-modal-title"
                    className="text-base font-black text-[#155e59]"
                  >
                    Yêu cầu chỉnh sửa bản vẽ Commission
                  </h3>
                  <p className="text-xs text-[#546d5e]">
                    Tác phẩm: {activeConversation.commission.characterName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="rounded-xl p-1.5 text-[#66736b] transition hover:bg-white hover:text-[#155e59]"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRevisionPayment} className="space-y-4 p-5">
              {/* Dòng Text nổi bật tính toán chi phí */}
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-bold tracking-wide text-orange-800 uppercase">
                  Chi phí chỉnh sửa phát sinh
                </p>
                <p className="mt-1 text-base font-black text-[#c2410c]">
                  Phí chỉnh sửa: {formatVNDFull(revisionFee)} (10% của{" "}
                  {formatVNDFull(baseOrderPrice)})
                </p>
              </div>

              {/* Textarea để nhập yêu cầu chỉnh sửa */}
              <div>
                <label
                  htmlFor="customer-revision-textarea"
                  className="block text-xs font-black text-[#155e59]"
                >
                  Nội dung yêu cầu chỉnh sửa <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="customer-revision-textarea"
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => {
                    setRevisionNote(e.target.value);
                    if (revisionError) setRevisionError("");
                  }}
                  placeholder="Mô tả chi tiết các điểm cần chỉnh sửa trên bản vẽ Pixel Art..."
                  className="mt-2 w-full rounded-xl border border-[#cfe3d0] bg-white p-3.5 text-sm text-[#26352f] outline-none placeholder:text-[#7a8c80] focus:border-[#155e59] focus:ring-2 focus:ring-[#8fc7a0]/40"
                />
                {revisionError && (
                  <p className="mt-1.5 text-xs font-bold text-red-600">{revisionError}</p>
                )}
              </div>

              {/* Nút Submit trong Modal */}
              <div className="flex flex-col-reverse justify-end gap-2.5 border-t border-[#e6efe8] pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="rounded-xl border border-[#cfe3d0] bg-white px-4 py-2.5 text-xs font-bold text-[#495e52] transition hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#155e59] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#0f4743] cursor-pointer"
                >
                  <CreditCard size={15} />
                  Thanh toán {formatVND(revisionFee)} để Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-xl border border-[#8fc7a0] bg-[#155e59] px-4 py-3 text-xs font-bold text-white shadow-lg"
        >
          <CheckCircle2 size={16} className="text-[#8fc7a0]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

