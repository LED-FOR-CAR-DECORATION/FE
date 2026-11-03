"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  ImagePlus,
  Plus,
  CheckCircle2,
  Sparkles,
  Eye,
  Check,
  Palette,
  Clock,
} from "lucide-react";
import { useCommissionChat } from "../hooks/useCommissionChat";
import { formatVND } from "../services/commission-chat.service";
import type { ChatMessage, ProgressStep, QuoteData } from "../types";
import WatermarkedPixelPreview from "./WatermarkedPixelPreview";

export default function StaffCommissionChat() {
  const {
    conversations,
    activeConversation,
    setActiveConvId,
    updateActiveConversation,
  } = useCommissionChat();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageInput, setMessageInput] = useState<string>("");

  // State 1 (Chưa có đơn - Dành riêng cho Staff): Form tạo Commission
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formCharacterName, setFormCharacterName] = useState<string>("Rồng Lửa");
  const [formDescription, setFormDescription] = useState<string>(
    "Pixel Art 64x64px, hiệu ứng lửa cháy quanh cánh, tông màu đỏ cam rực rỡ."
  );
  const [formPrice, setFormPrice] = useState<string>("500000");
  const [formDeliveryDate, setFormDeliveryDate] = useState<string>("2026-11-10");

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

  // Đồng bộ giá trị mặc định của form khi chuyển hội thoại
  useEffect(() => {
    setFormCharacterName(activeConversation.commission.characterName || "Rồng Lửa");
    setFormDescription(
      activeConversation.commission.description ||
        "Thiết kế nhân vật Pixel Art 64x64px tương thích bảng LED MIRAGE."
    );
    setFormPrice(String(activeConversation.commission.price || 500000));
    setFormDeliveryDate(activeConversation.commission.deliveryDate || "2026-11-15");
    setIsFormOpen(false);
  }, [activeConversation.id]);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.commission.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Nhân viên gửi tin nhắn tư vấn
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "STAFF",
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

  // Nhân viên gửi ảnh phác thảo
  const handleAttachDraftImage = () => {
    const newMsg: ChatMessage = {
      id: `msg-img-${Date.now()}`,
      sender: "STAFF",
      text: "Mình gửi bạn bản phác thảo khung lưới Pixel Art để bạn xem bố cục trước nhé!",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      lastMessage: newMsg.text!,
      lastTime: "Vừa xong",
      messages: [...conv.messages, newMsg],
    }));

    showToast("Đã gửi hình ảnh phác thảo cho khách hàng!");
  };

  // Staff tạo Form Commission (State 1 -> State 2 + đẩy System Action Card vào timeline)
  const handleCreateCommissionForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(formPrice.replace(/\D/g, "")) || 500000;
    const charName = formCharacterName.trim() || "Rồng Lửa";
    const desc =
      formDescription.trim() || "Thiết kế nhân vật Pixel Art theo yêu cầu riêng.";
    const deliv = formDeliveryDate || "2026-11-15";

    const quoteData: QuoteData = {
      characterName: charName,
      description: desc,
      price: parsedPrice,
      deliveryDate: deliv,
      isPaid: false,
      isApproved: false,
    };

    const systemCardMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: "SYSTEM",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      quoteCard: quoteData,
    };

    updateActiveConversation((conv) => ({
      ...conv,
      orderState: "IN_PROGRESS",
      progressStep: "WAITING_PAYMENT",
      commission: quoteData,
      lastMessage: `Nhân viên đã tạo một yêu cầu: ${charName} - ${formatVND(parsedPrice)}`,
      lastTime: "Vừa xong",
      messages: [...conv.messages, systemCardMsg],
    }));

    setIsFormOpen(false);
    showToast(`Đã tạo báo giá "${charName}" và gửi Thẻ thanh toán cho khách hàng!`);
  };

  // Staff chuyển trạng thái tiến độ hoặc gửi bản vẽ sang Nghiệm thu (State 3)
  const handleMoveToReview = () => {
    const notifyMsg: ChatMessage = {
      id: `msg-review-${Date.now()}`,
      sender: "STAFF",
      text: `Bản vẽ Preview có gắn Watermark cho nhân vật "${activeConversation.commission.characterName}" đã sẵn sàng! Mời bạn kiểm tra và nghiệm thu ở cột thông tin bên phải nhé.`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      orderState: "REVIEW",
      progressStep: "REVIEWING",
      lastMessage: notifyMsg.text!,
      lastTime: "Vừa xong",
      messages: [...conv.messages, notifyMsg],
    }));

    showToast("Đã gửi bản vẽ Preview (có Watermark) để khách hàng nghiệm thu!");
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px] w-full flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3 text-[#26352f] shadow-sm">
      {/* CORE LAYOUT 3 CỘT KIỂU ZALO PC DÀNH CHO STAFF (25% - 50% - 25%) */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* ===================================================================
            CỘT 1: DANH SÁCH KHÁCH HÀNG ĐANG CHAT (25% CHIỀU RỘNG - CỘT TRÁI)
        =================================================================== */}
        <section className="flex w-1/4 min-w-[250px] flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
          <div className="border-b border-[#e4efe6] bg-[#eaf5e8] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <h1 className="text-sm font-black text-[#155e59]">Quản lý hội thoại</h1>
              <span className="rounded-full bg-[#155e59] px-2.5 py-0.5 text-[10px] font-bold text-white">
                {conversations.length} khách
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
                placeholder="Tìm tên khách hàng, đơn vẽ..."
                className="w-full rounded-xl border border-[#cfe3d0] bg-[#fffdf9] py-2 pr-3 pl-9 text-xs text-[#26352f] outline-none placeholder:text-[#7a8c80] focus:border-[#155e59] focus:ring-2 focus:ring-[#8fc7a0]/40"
              />
            </div>
          </div>

          {/* Danh sách khách hàng đang chat */}
          <div className="flex-1 space-y-1 divide-y divide-[#f0f5f1] overflow-y-auto p-2">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation.id;
              const stateBadge =
                conv.orderState === "REVIEW"
                  ? { label: "Đang nghiệm thu", cls: "bg-amber-100 text-amber-800" }
                  : conv.orderState === "IN_PROGRESS"
                  ? { label: "Đang thực hiện", cls: "bg-[#dcebd4] text-[#155e59]" }
                  : { label: "Chưa có đơn", cls: "bg-gray-100 text-gray-600" };

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
                      {conv.customerAvatar}
                    </div>
                    {conv.online && (
                      <span
                        className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                        title="Khách đang trực tuyến"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-extrabold text-[#155e59]">
                        {conv.customerName}
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
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${stateBadge.cls}`}
                      >
                        {stateBadge.label}
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
          {/* Header hiển thị thông tin khách hàng đang chat */}
          <div className="flex items-center justify-between border-b border-[#cfe3d0] bg-[#eaf5e8] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#155e59] text-xs font-black text-white">
                  {activeConversation.customerAvatar}
                </div>
                {activeConversation.online && (
                  <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-black text-[#155e59]">
                  Khách hàng: {activeConversation.customerName}
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-[#4b6758]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      activeConversation.online ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                  {activeConversation.online ? "Đang trực tuyến" : "Ngoại tuyến"}
                </p>
              </div>
            </div>

            <span className="rounded-xl border border-[#b7d9be] bg-[#fffdf7] px-3 py-1.5 text-xs font-bold text-[#155e59]">
              Dự án: {activeConversation.commission.characterName || "Chưa tạo đơn"}
            </span>
          </div>

          {/* Vùng hiển thị tin nhắn (Chat timeline) */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfaf4] p-5">
            {activeConversation.messages.map((msg) => {
              // System Action Card hiển thị trong timeline
              if (msg.sender === "SYSTEM" && msg.quoteCard) {
                const card = msg.quoteCard;
                return (
                  <div key={msg.id} className="my-3 flex justify-center">
                    <div className="w-full max-w-md overflow-hidden rounded-xl border-2 border-[#8fc7a0] bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-[#dce8df] bg-[#eaf5e8] px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-black text-[#155e59]">
                          <Sparkles size={14} />
                          THẺ BÁO GIÁ ĐÃ GỬI KHÁCH HÀNG
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
                            <span className="text-[#66736b]">Giá báo khách:</span>
                            <strong className="text-sm font-black text-[#155e59]">
                              {formatVND(card.price)}
                            </strong>
                          </div>
                        </div>

                        <div
                          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold ${
                            card.isPaid
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {card.isPaid ? (
                            <>
                              <CheckCircle2 size={15} />
                              Khách hàng đã thanh toán ({formatVND(card.price)})
                            </>
                          ) : (
                            <>
                              <Clock size={15} />
                              Đang chờ khách bấm [Thanh toán ngay]
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Bong bóng chat của Staff (bên phải) và Customer (bên trái)
              const isStaff = msg.sender === "STAFF";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isStaff ? "items-end" : "items-start"
                  }`}
                >
                  <span className="mb-1 px-1 text-[10px] font-semibold text-[#7a8c80]">
                    {isStaff ? "Nhân viên (Bạn)" : activeConversation.customerName} •{" "}
                    {msg.time}
                  </span>
                  <div
                    className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                      isStaff
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
              onClick={handleAttachDraftImage}
              title="Đính kèm ảnh phác thảo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cfe3d0] bg-[#f8f7ef] text-[#155e59] transition hover:bg-[#eaf5e8]"
            >
              <ImagePlus size={18} />
            </button>

            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Nhập tin nhắn tư vấn khách hàng..."
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
            CỘT 3: BẢNG NGHIỆP VỤ CHỐT ĐƠN (DÀNH RIÊNG CHO STAFF - 25%)
        =================================================================== */}
        <aside className="flex w-1/4 min-w-[270px] flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
          <div className="border-b border-[#cfe3d0] bg-[#eaf5e8] px-4 py-3.5">
            <h2 className="text-sm font-black text-[#155e59]">
              Nghiệp vụ chốt đơn Commission
            </h2>
            <p className="mt-0.5 text-[11px] text-[#546d5e]">
              Tạo báo giá, cập nhật tiến độ & gửi nghiệm thu
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* ===============================================================
                STATE 1 (CHƯA CÓ ĐƠN - DÀNH CHO STAFF): NÚT [+ TẠO FORM COMMISSION]
            =============================================================== */}
            {activeConversation.orderState === "NO_ORDER" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-4 text-center">
                  <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf5e8] text-[#155e59]">
                    <Palette size={22} />
                  </div>
                  <h3 className="text-sm font-black text-[#155e59]">
                    Chưa có đơn Commission
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#66736b]">
                    Khách hàng <strong>{activeConversation.customerName}</strong> đang chờ
                    báo giá. Hãy tạo Form Commission để gửi thẻ thanh toán vào khung chat.
                  </p>
                </div>

                {!isFormOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#155e59] px-4 py-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0f4743] cursor-pointer"
                  >
                    <Plus size={18} />
                    + Tạo Form Commission
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateCommissionForm}
                    className="space-y-3 rounded-xl border border-[#8fc7a0] bg-[#f8f7ef] p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-[#dce8df] pb-2">
                      <h4 className="text-xs font-black text-[#155e59] uppercase">
                        Form Báo Giá Commission
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="text-xs font-bold text-[#66736b] hover:text-[#155e59]"
                      >
                        Đóng
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#155e59]">
                        Tên nhân vật
                      </label>
                      <input
                        type="text"
                        required
                        value={formCharacterName}
                        onChange={(e) => setFormCharacterName(e.target.value)}
                        placeholder="VD: Rồng Lửa"
                        className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs outline-none focus:border-[#155e59]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#155e59]">
                        Mô tả
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Mô tả chi tiết kích thước pixel, hiệu ứng..."
                        className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs outline-none focus:border-[#155e59]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#155e59]">
                        Giá tiền (VNĐ)
                      </label>
                      <input
                        type="number"
                        required
                        min={50000}
                        step={10000}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        placeholder="500000"
                        className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs font-bold text-[#155e59] outline-none focus:border-[#155e59]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#155e59]">
                        Ngày giao
                      </label>
                      <input
                        type="date"
                        required
                        value={formDeliveryDate}
                        onChange={(e) => setFormDeliveryDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#cfe3d0] bg-white px-3 py-2 text-xs outline-none focus:border-[#155e59]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[#155e59] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743] cursor-pointer"
                    >
                      Tạo & Gửi Thẻ Báo Giá
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ===============================================================
                STATE 2 (ĐANG THỰC HIỆN): HIỂN THỊ & CẬP NHẬT TIẾN ĐỘ ĐƠN VẼ
            =============================================================== */}
            {activeConversation.orderState === "IN_PROGRESS" && (
              <div className="space-y-4">
                <div className="space-y-2 rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#66736b] uppercase">
                      Đơn đang thực hiện
                    </span>
                    <span className="rounded-md bg-[#dcebd4] px-2 py-0.5 text-[10px] font-black text-[#155e59]">
                      {activeConversation.commission.isPaid
                        ? "Đã thanh toán"
                        : "Chờ thanh toán"}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#155e59]">
                    {activeConversation.commission.characterName}
                  </h3>
                  <p className="text-xs text-[#54655c]">
                    {activeConversation.commission.description}
                  </p>
                  <div className="flex items-center justify-between border-t border-[#e2e8e3] pt-2 text-xs">
                    <span className="text-[#66736b]">Giá trị:</span>
                    <strong className="text-sm font-black text-[#155e59]">
                      {formatVND(activeConversation.commission.price)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#66736b]">Hạn giao:</span>
                    <strong className="text-[#26352f]">
                      {activeConversation.commission.deliveryDate}
                    </strong>
                  </div>
                </div>

                {/* Cập nhật tiến độ đơn vẽ */}
                <div className="rounded-xl border border-[#dce8df] bg-white p-4 shadow-xs">
                  <h4 className="mb-3 text-xs font-black text-[#155e59] uppercase">
                    Tiến độ đơn vẽ (Click để cập nhật)
                  </h4>

                  <div className="space-y-2.5">
                    {[
                      {
                        key: "WAITING_PAYMENT" as ProgressStep,
                        label: "Chờ thanh toán",
                        desc: "Đã gửi báo giá cho khách hàng",
                      },
                      {
                        key: "DRAWING" as ProgressStep,
                        label: "Đang vẽ",
                        desc: "Đang thiết kế nhân vật Pixel Art",
                      },
                      {
                        key: "REVIEWING" as ProgressStep,
                        label: "Đang nghiệm thu",
                        desc: "Chuyển sang giao file Preview có Watermark",
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
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => {
                            if (step.key === "REVIEWING") {
                              handleMoveToReview();
                            } else {
                              updateActiveConversation((c) => ({
                                ...c,
                                progressStep: step.key,
                              }));
                            }
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                            isCurrent
                              ? "border-[#155e59] bg-[#eaf5e8]"
                              : isDone
                              ? "border-[#cfe3d0] bg-[#f8fbf8]"
                              : "border-[#e6ece7] bg-white hover:bg-gray-50"
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
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleMoveToReview}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#155e59] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743] cursor-pointer"
                  >
                    <Eye size={15} />
                    Gửi bản Preview sang bước Nghiệm thu
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                STATE 3 (ĐANG NGHIỆM THU): STAFF THEO DÕI KẾT QUẢ NGHIỆM THU
            =============================================================== */}
            {activeConversation.orderState === "REVIEW" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#8fc7a0] bg-[#eaf5e8] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#155e59]">
                      Đã gửi bản vẽ Nghiệm thu
                    </span>
                    <span className="rounded-full bg-[#155e59] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {activeConversation.commission.isApproved
                        ? "Khách đã duyệt"
                        : "Chờ khách duyệt"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#486355]">
                    Tác phẩm:{" "}
                    <strong>{activeConversation.commission.characterName}</strong> •{" "}
                    <strong>{formatVND(activeConversation.commission.price)}</strong>
                  </p>
                </div>

                {/* Bản Preview có Watermark đã gửi cho khách */}
                <WatermarkedPixelPreview
                  characterName={activeConversation.commission.characterName}
                  isApproved={activeConversation.commission.isApproved}
                />

                <div className="rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3.5 text-xs text-[#54655c]">
                  {activeConversation.commission.isApproved ? (
                    <p className="font-bold text-emerald-800">
                      Khách hàng đã phê duyệt bản vẽ và tải xuống file gốc thành công.
                    </p>
                  ) : (
                    <p>
                      <strong className="text-[#155e59]">Trạng thái:</strong> Đang chờ
                      khách hàng <strong>{activeConversation.customerName}</strong> bấm{" "}
                      <em>Phê duyệt & Tải file gốc</em> hoặc gửi{" "}
                      <em>Yêu cầu chỉnh sửa (+10% phí)</em>.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

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

