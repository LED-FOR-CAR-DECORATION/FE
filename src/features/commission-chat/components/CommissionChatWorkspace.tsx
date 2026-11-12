"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Send,
  ImagePlus,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
  MessageSquare,
  ShoppingBag,
  LayoutDashboard,
  ClipboardList,
  Truck,
  User,
  X,
  CreditCard,
  ShieldCheck,
  Calendar,
  FileText,
  DollarSign,
  Eye,
  Check,
  Palette,
  SlidersHorizontal,
} from "lucide-react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type RoleView = "CUSTOMER" | "STAFF";
type OrderState = "NO_ORDER" | "IN_PROGRESS" | "REVIEW";
type ProgressStep = "WAITING_PAYMENT" | "DRAWING" | "REVIEWING";

interface QuoteData {
  characterName: string;
  description: string;
  price: number;
  deliveryDate: string;
  isPaid?: boolean;
}

interface ChatMessage {
  id: string;
  sender: "CUSTOMER" | "STAFF" | "SYSTEM";
  text?: string;
  time: string;
  imageUrl?: string;
  quoteCard?: QuoteData;
}

interface Conversation {
  id: string;
  customerName: string;
  customerAvatar: string;
  staffName: string;
  staffAvatar: string;
  online: boolean;
  lastMessage: string;
  lastTime: string;
  unreadCount?: number;
  orderState: OrderState;
  progressStep: ProgressStep;
  commission: QuoteData;
  messages: ChatMessage[];
}

// ============================================================================
// HELPERS & MOCK DATA
// ============================================================================

const formatVND = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;
const formatVNDFull = (amount: number) => `${amount.toLocaleString("vi-VN")} VNĐ`;

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    customerName: "Nguyễn Minh Anh",
    customerAvatar: "MA",
    staffName: "Hoàng Bảo (Mirage Artist)",
    staffAvatar: "HB",
    online: true,
    lastMessage: "Nhân viên đã gửi bản vẽ nghiệm thu có gắn watermark.",
    lastTime: "10:45",
    unreadCount: 1,
    orderState: "REVIEW",
    progressStep: "REVIEWING",
    commission: {
      characterName: "Rồng Lửa",
      description:
        "Pixel Art 64x64px, hiệu ứng lửa cháy quanh cánh, tông màu đỏ cam rực rỡ tương thích bảng LED Matrix 64x64.",
      price: 500000,
      deliveryDate: "2026-11-10",
      isPaid: true,
    },
    messages: [
      {
        id: "m-1",
        sender: "CUSTOMER",
        text: "Chào shop! Mình muốn đặt vẽ một bé Rồng Lửa theo phong cách Pixel Art để hiển thị lên bảng LED 64x64 của MIRAGE ạ.",
        time: "09:15",
      },
      {
        id: "m-2",
        sender: "STAFF",
        text: "Chào Minh Anh! MIRAGE rất vui được hỗ trợ bạn. Bạn muốn Rồng Lửa có hiệu ứng chuyển động cánh hay phun lửa không ạ?",
        time: "09:17",
      },
      {
        id: "m-3",
        sender: "CUSTOMER",
        text: "Mình muốn tư thế đang vỗ cánh kèm lửa rực xung quanh nhé, tông màu chủ đạo đỏ - cam nổi bật trên nền tối.",
        time: "09:20",
      },
      {
        id: "m-4",
        sender: "STAFF",
        text: "Dạ mình đã nắm rõ ý tưởng! Mình gửi bạn thẻ báo giá chi tiết bên dưới nhé:",
        time: "09:25",
      },
      {
        id: "m-5",
        sender: "SYSTEM",
        time: "09:26",
        quoteCard: {
          characterName: "Rồng Lửa",
          description:
            "Pixel Art 64x64px, hiệu ứng lửa cháy quanh cánh, tông màu đỏ cam rực rỡ tương thích bảng LED Matrix 64x64.",
          price: 500000,
          deliveryDate: "2026-11-10",
          isPaid: false,
        },
      },
      {
        id: "m-6",
        sender: "CUSTOMER",
        text: "Mình vừa bấm thanh toán rồi nha shop ơi! Mong chờ bản vẽ quá.",
        time: "09:30",
      },
      {
        id: "m-7",
        sender: "STAFF",
        text: "Bản vẽ Preview cho nhân vật Rồng Lửa đã hoàn thành! Bạn kiểm tra và nghiệm thu ở bảng thông tin bên phải màn hình nhé.",
        time: "10:45",
      },
    ],
  },
  {
    id: "conv-2",
    customerName: "Trần Hoàng Nam",
    customerAvatar: "HN",
    staffName: "Hoàng Bảo (Mirage Artist)",
    staffAvatar: "HB",
    online: true,
    lastMessage: "Đơn đang trong giai đoạn phác thảo khung hình Pixel.",
    lastTime: "Hôm qua",
    orderState: "IN_PROGRESS",
    progressStep: "DRAWING",
    commission: {
      characterName: "Mèo Thần Tài Cyberpunk",
      description: "Hoạt ảnh vẫy tay 4 khung hình, đeo kính neon xanh lá, kích thước 32x32px.",
      price: 450000,
      deliveryDate: "2026-11-12",
      isPaid: true,
    },
    messages: [
      {
        id: "m-201",
        sender: "CUSTOMER",
        text: "Shop ơi, mình muốn đặt vẽ Mèo Thần Tài phong cách Cyberpunk để treo quầy thu ngân.",
        time: "Hôm qua",
      },
      {
        id: "m-202",
        sender: "SYSTEM",
        time: "Hôm qua",
        quoteCard: {
          characterName: "Mèo Thần Tài Cyberpunk",
          description: "Hoạt ảnh vẫy tay 4 khung hình, đeo kính neon xanh lá, kích thước 32x32px.",
          price: 450000,
          deliveryDate: "2026-11-12",
          isPaid: true,
        },
      },
      {
        id: "m-203",
        sender: "STAFF",
        text: "Cảm ơn Nam! Đội ngũ Artist đang tiến hành vẽ khung hình chuyển động cho bạn rồi nhé.",
        time: "Hôm qua",
      },
    ],
  },
  {
    id: "conv-3",
    customerName: "Lê Thu Hà",
    customerAvatar: "TH",
    staffName: "Hoàng Bảo (Mirage Artist)",
    staffAvatar: "HB",
    online: false,
    lastMessage: "Tư vấn giúp mình gói vẽ nhân vật Hiệp Sĩ Ánh Sáng nhé!",
    lastTime: "Thứ 2",
    orderState: "NO_ORDER",
    progressStep: "WAITING_PAYMENT",
    commission: {
      characterName: "Hiệp Sĩ Ánh Sáng",
      description: "",
      price: 500000,
      deliveryDate: "2026-11-15",
      isPaid: false,
    },
    messages: [
      {
        id: "m-301",
        sender: "CUSTOMER",
        text: "Chào MIRAGE, tư vấn giúp mình gói vẽ nhân vật Hiệp Sĩ Ánh Sáng để nạp vào khung LED để bàn nhé!",
        time: "Thứ 2",
      },
      {
        id: "m-302",
        sender: "STAFF",
        text: "Chào Thu Hà! Bạn chia sẻ thêm về màu sắc giáp và vũ khí mong muốn để mình tạo Form Commission báo giá ngay cho bạn nhé.",
        time: "Thứ 2",
      },
    ],
  },
];

// ============================================================================
// PIXEL ART PREVIEW WITH WATERMARK COMPONENT
// ============================================================================

function WatermarkedPixelPreview({ characterName }: { characterName: string }) {
  // 8x8 stylized pixel dragon grid for visual appeal
  const dragonGrid = [
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 2, 2, 1, 1, 2, 2, 1],
    [1, 2, 3, 2, 2, 3, 2, 1],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [1, 3, 2, 4, 4, 2, 3, 1],
    [2, 3, 2, 2, 2, 2, 3, 2],
    [0, 1, 3, 1, 1, 3, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
  ];

  const colorMap: Record<number, string> = {
    0: "bg-[#1a2421]",
    1: "bg-[#991b1b]",
    2: "bg-[#ef4444]",
    3: "bg-[#f97316]",
    4: "bg-[#fde047]",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#cfe3d0] bg-[#141e1b] p-5 shadow-sm select-none">
      {/* Pixel Canvas */}
      <div className="mx-auto grid h-44 w-44 grid-cols-8 gap-1 rounded-lg border-2 border-[#263832] bg-[#0f1715] p-2.5 shadow-inner">
        {dragonGrid.flat().map((cell, idx) => (
          <div
            key={idx}
            className={`rounded-[2px] ${colorMap[cell]} transition-transform duration-300`}
          />
        ))}
      </div>

      {/* Diagonal Watermark Overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/15">
        <div className="-rotate-12 space-y-2 text-center">
          <p className="rounded border border-white/40 bg-black/45 px-3 py-1 text-xs font-black tracking-[0.22em] text-white/85 uppercase backdrop-blur-[1px]">
            MIRAGE PREVIEW • BẢN XEM TRƯỚC
          </p>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-white/75 uppercase">
            CHƯA PHÊ DUYỆT • KHÔNG SAO CHÉP
          </p>
        </div>
      </div>

      {/* Caption */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#bfe3c8]">
        <span className="font-semibold">Tác phẩm: {characterName}</span>
        <span className="rounded bg-[#155e59] px-2 py-0.5 font-bold text-white">64x64 PX</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: KHÔNG GIAN CHAT & CHỐT ĐƠN COMMISSION
// ============================================================================

export default function CommissionChatWorkspace() {
  // Role toggle state: Customer vs Staff
  const [roleView, setRoleView] = useState<RoleView>("CUSTOMER");

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Message input state
  const [messageInput, setMessageInput] = useState<string>("");

  // Staff Commission Form state (State 1)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formCharacterName, setFormCharacterName] = useState<string>("Rồng Lửa");
  const [formDescription, setFormDescription] = useState<string>(
    "Pixel Art 64x64px, hiệu ứng lửa cháy quanh cánh, tông màu đỏ cam rực rỡ."
  );
  const [formPrice, setFormPrice] = useState<string>("500000");
  const [formDeliveryDate, setFormDeliveryDate] = useState<string>("2026-11-10");

  // Revision Paywall Modal state (Business Logic)
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionNote, setRevisionNote] = useState<string>("");
  const [revisionError, setRevisionError] = useState<string>("");

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0];

  const filteredConversations = conversations.filter((conv) => {
    const targetName =
      roleView === "CUSTOMER" ? conv.staffName : conv.customerName;
    return (
      targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.commission.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation.messages.length, activeConvId]);

  // Update helper for current conversation
  const updateActiveConversation = (updater: (conv: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === activeConversation.id ? updater(conv) : conv))
    );
  };

  // Send text message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: roleView,
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

  // Simulate attaching an image in chat
  const handleAttachSampleImage = () => {
    const newMsg: ChatMessage = {
      id: `msg-img-${Date.now()}`,
      sender: roleView,
      text:
        roleView === "CUSTOMER"
          ? "Mình gửi thêm ảnh mẫu tham khảo bảng màu nhé!"
          : "Mình gửi ảnh phác thảo khung lưới Pixel để bạn xem trước nhé!",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      lastMessage: newMsg.text ?? "Đã gửi một hình ảnh",
      lastTime: "Vừa xong",
      messages: [...conv.messages, newMsg],
    }));

    showToast("Đã đính kèm ảnh vào cuộc trò chuyện!");
  };

  // Staff creates a Commission Quote Form (State 1 -> State 2 + System Action Card)
  const handleCreateCommissionForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(formPrice.replace(/\D/g, "")) || 500000;
    const charName = formCharacterName.trim() || "Rồng Lửa";
    const desc =
      formDescription.trim() || "Thiết kế nhân vật Pixel Art theo yêu cầu riêng.";
    const deliv = formDeliveryDate || "2026-11-10";

    const quoteData: QuoteData = {
      characterName: charName,
      description: desc,
      price: parsedPrice,
      deliveryDate: deliv,
      isPaid: false,
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
    showToast(`Đã tạo Form Commission "${charName}" và gửi thẻ báo giá vào khung chat!`);
  };

  // Customer clicks [Thanh toán ngay] on System Action Card
  const handlePayCommission = (quotePrice?: number) => {
    const paidAmount = quotePrice ?? activeConversation.commission.price;
    const confirmMsg: ChatMessage = {
      id: `msg-pay-${Date.now()}`,
      sender: "CUSTOMER",
      text: `Đã thanh toán thành công đơn Commission "${activeConversation.commission.characterName}" (${formatVND(paidAmount)}).`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      orderState: conv.orderState === "NO_ORDER" ? "IN_PROGRESS" : conv.orderState,
      progressStep: "DRAWING",
      commission: { ...conv.commission, isPaid: true },
      lastMessage: confirmMsg.text!,
      lastTime: "Vừa xong",
      messages: conv.messages.map((m) =>
        m.quoteCard ? { ...m, quoteCard: { ...m.quoteCard, isPaid: true } } : m
      ).concat(confirmMsg),
    }));

    showToast(`Thanh toán thành công ${formatVND(paidAmount)}! Đơn hàng đã chuyển sang trạng thái Đang vẽ.`);
  };

  // Customer approves & downloads original file in State 3
  const handleApproveAndDownload = () => {
    const doneMsg: ChatMessage = {
      id: `msg-approve-${Date.now()}`,
      sender: "CUSTOMER",
      text: `Mình đã phê duyệt bản vẽ "${activeConversation.commission.characterName}" và tải file gốc thành công. Cảm ơn shop rất nhiều!`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    updateActiveConversation((conv) => ({
      ...conv,
      lastMessage: "Khách hàng đã phê duyệt & tải file gốc.",
      lastTime: "Vừa xong",
      messages: [...conv.messages, doneMsg],
    }));

    showToast("Đã phê duyệt đơn vẽ! Đang tải xuống file gốc chất lượng cao (không watermark)...");
  };

  // Customer submits Revision Paywall Modal
  const baseOrderPrice = activeConversation.commission.price || 500000;
  const revisionFee = Math.round(baseOrderPrice * 0.1); // 10% phí chỉnh sửa (50.000đ cho đơn 500.000đ)

  const handleSubmitRevisionPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      setRevisionError("Vui lòng nhập chi tiết nội dung bạn muốn chỉnh sửa.");
      return;
    }

    const revisionMsg: ChatMessage = {
      id: `msg-rev-${Date.now()}`,
      sender: "CUSTOMER",
      text: `[Yêu cầu chỉnh sửa - Đã thanh toán phụ phí +10% (${formatVND(revisionFee)})]: ${revisionNote.trim()}`,
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
    showToast(
      `Đã thanh toán ${formatVND(revisionFee)} và gửi yêu cầu chỉnh sửa cho Artist!`
    );
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8f7ef] text-[#26352f]">
      {/* =====================================================================
          SIMULATION CONTROL BAR (CHUYỂN ĐỔI GÓC NHÌN CUSTOMER / STAFF & STATE)
      ===================================================================== */}
      <div className="z-30 flex flex-wrap items-center justify-between gap-2 border-b border-[#cfe3d0] bg-[#155e59] px-4 py-2 text-xs text-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 font-bold tracking-wider uppercase">
            <Sparkles size={13} /> Chế độ mô phỏng Layout
          </span>
          <span className="hidden text-[#d7efe0] sm:inline">
            Chuyển đổi góc nhìn để kiểm thử điểm truy cập và quyền thao tác ở Cột 3:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick State Switcher for current conversation */}
          <div className="flex items-center gap-1 rounded-lg bg-[#0f4541] p-1">
            <span className="px-2 text-[11px] font-semibold text-[#b8dfc2]">
              Trạng thái Cột 3:
            </span>
            <button
              type="button"
              onClick={() => {
                updateActiveConversation((c) => ({ ...c, orderState: "NO_ORDER" }));
                setIsFormOpen(false);
              }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                activeConversation.orderState === "NO_ORDER"
                  ? "bg-[#8fc7a0] text-[#103828] shadow-xs"
                  : "text-[#d7efe0] hover:bg-white/10"
              }`}
            >
              State 1: Chưa có đơn
            </button>
            <button
              type="button"
              onClick={() =>
                updateActiveConversation((c) => ({ ...c, orderState: "IN_PROGRESS" }))
              }
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                activeConversation.orderState === "IN_PROGRESS"
                  ? "bg-[#8fc7a0] text-[#103828] shadow-xs"
                  : "text-[#d7efe0] hover:bg-white/10"
              }`}
            >
              State 2: Đang thực hiện
            </button>
            <button
              type="button"
              onClick={() =>
                updateActiveConversation((c) => ({
                  ...c,
                  orderState: "REVIEW",
                  progressStep: "REVIEWING",
                }))
              }
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                activeConversation.orderState === "REVIEW"
                  ? "bg-[#8fc7a0] text-[#103828] shadow-xs"
                  : "text-[#d7efe0] hover:bg-white/10"
              }`}
            >
              State 3: Nghiệm thu
            </button>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center rounded-lg bg-[#0f4541] p-1">
            <button
              type="button"
              onClick={() => setRoleView("CUSTOMER")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${
                roleView === "CUSTOMER"
                  ? "bg-white text-[#155e59] shadow-xs"
                  : "text-[#d7efe0] hover:bg-white/10"
              }`}
            >
              <User size={13} />
              Góc nhìn: Khách hàng (Customer)
            </button>
            <button
              type="button"
              onClick={() => setRoleView("STAFF")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${
                roleView === "STAFF"
                  ? "bg-white text-[#155e59] shadow-xs"
                  : "text-[#d7efe0] hover:bg-white/10"
              }`}
            >
              <ShieldCheck size={13} />
              Góc nhìn: Nhân viên (Staff)
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CUSTOMER NAVIGATION ENTRY POINT: HEADER NGANG VỚI NÚT "CHAT NGAY"
      ===================================================================== */}
      {roleView === "CUSTOMER" && (
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#cfe3d0] bg-[#8fc7a0] px-6 shadow-xs">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="rounded-xl border-2 border-[#155e59] bg-[#fffdf5] px-4 py-1 text-lg font-black tracking-tight text-[#155e59] shadow-[2px_2px_0_#155e59]"
            >
              MIRAGE
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-bold text-[#155e59] md:flex">
              <Link href="/" className="transition hover:text-white">
                Cửa hàng LED
              </Link>
              <Link href="/commission" className="transition hover:text-white">
                Đặt vẽ Commission
              </Link>
              <span className="text-[#155e59]/70">|</span>
              {/* Điểm truy cập tính năng chat cho Customer */}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#155e59] bg-[#155e59] px-4 py-2 text-xs font-bold text-white shadow-sm ring-2 ring-white/60 transition hover:bg-[#104a46]"
              >
                <MessageSquare size={15} />
                Chat ngay
                <span className="rounded-full bg-[#8fc7a0] px-1.5 py-0.2 text-[10px] font-black text-[#155e59]">
                  Đang mở
                </span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#cfe3d0] bg-[#fffdf7] px-3 py-1.5 text-xs font-bold text-[#155e59] shadow-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#155e59] text-[11px] font-bold text-white">
                MA
              </div>
              <span>Khách hàng: Nguyễn Minh Anh</span>
            </div>
          </div>
        </header>
      )}

      {/* =====================================================================
          MAIN BODY WRAPPER (CÓ SIDEBAR DỌC BÊN TRÁI NẾU LÀ STAFF)
      ===================================================================== */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* STAFF NAVIGATION ENTRY POINT: SIDEBAR DỌC BÊN TRÁI VỚI MỤC "QUẢN LÝ CHAT" */}
        {roleView === "STAFF" && (
          <aside className="flex w-60 shrink-0 flex-col border-r border-[#dce8df] bg-[#f3f9f4] select-none">
            <div className="flex h-16 items-center gap-2.5 border-b border-[#cfe3d0] bg-[#dcebd4] px-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#155e59] text-sm font-black text-white shadow-xs">
                M
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-[#155e59]">
                  MIRAGE STAFF
                </p>
                <p className="text-[10px] font-semibold text-[#4c6b5a]">
                  Hệ thống quản trị viên
                </p>
              </div>
            </div>

            <nav className="flex-1 space-y-1.5 p-3">
              <p className="px-3 py-1 text-[10px] font-black tracking-wider text-[#66736b] uppercase">
                Điều hướng nghiệp vụ
              </p>
              <Link
                href="/staff/orders"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#486355] transition hover:bg-[#e3f2e6]"
              >
                <ShoppingBag size={16} />
                Quản lý đơn hàng
              </Link>
              <Link
                href="/staff/commission"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#486355] transition hover:bg-[#e3f2e6]"
              >
                <ClipboardList size={16} />
                Yêu cầu Commission
              </Link>

              {/* Điểm truy cập tính năng chat cho Staff */}
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-[#155e59] bg-[#155e59] px-3.5 py-2.5 text-left text-xs font-bold text-white shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <MessageSquare size={16} />
                  Quản lý Chat
                </span>
                <span className="rounded-full bg-[#8fc7a0] px-2 py-0.5 text-[10px] font-black text-[#155e59]">
                  3
                </span>
              </button>

              <Link
                href="/staff/deliveries"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#486355] transition hover:bg-[#e3f2e6]"
              >
                <Truck size={16} />
                Quản lý giao hàng
              </Link>
            </nav>

            <div className="border-t border-[#dce8df] bg-[#eaf5e8] p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#155e59] text-xs font-bold text-white">
                  HB
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#155e59]">
                    Hoàng Bảo (Staff)
                  </p>
                  <p className="text-[10px] text-[#527060]">Trực tuyến • Tư vấn viên</p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ===================================================================
            CORE LAYOUT: CẤU TRÚC 3 CỘT KIỂU ZALO PC (25% - 50% - 25%)
        =================================================================== */}
        <div className="flex min-h-0 flex-1 overflow-hidden p-3 gap-3 bg-[#f8f7ef]">
          {/* -----------------------------------------------------------------
              CỘT 1: DANH SÁCH HỘI THOẠI (25% CHIỀU RỘNG - CỘT TRÁI)
          ----------------------------------------------------------------- */}
          <section className="flex w-1/4 min-w-[250px] flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
            {/* Header Cột 1 + Thanh tìm kiếm hội thoại */}
            <div className="border-b border-[#e4efe6] bg-[#eaf5e8] p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-black text-[#155e59]">
                  Danh sách hội thoại
                </h2>
                <span className="rounded-full bg-[#155e59] px-2 py-0.5 text-[10px] font-bold text-white">
                  {conversations.length} hội thoại
                </span>
              </div>
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

            {/* Danh sách các user đang chat */}
            <div className="flex-1 divide-y divide-[#f0f5f1] overflow-y-auto p-2 space-y-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversation.id;
                const displayName =
                  roleView === "CUSTOMER" ? conv.staffName : conv.customerName;
                const displayAvatar =
                  roleView === "CUSTOMER" ? conv.staffAvatar : conv.customerAvatar;

                const stateBadge =
                  conv.orderState === "REVIEW"
                    ? { label: "Nghiệm thu", cls: "bg-amber-100 text-amber-800" }
                    : conv.orderState === "IN_PROGRESS"
                    ? { label: "Đang thực hiện", cls: "bg-[#dcebd4] text-[#155e59]" }
                    : { label: "Chưa tạo đơn", cls: "bg-gray-100 text-gray-600" };

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
                    {/* Avatar + Online dot */}
                    <div className="relative shrink-0">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl font-black text-xs ${
                          isActive
                            ? "bg-[#155e59] text-white"
                            : "bg-[#dcebd4] text-[#155e59]"
                        }`}
                      >
                        {displayAvatar}
                      </div>
                      {conv.online && (
                        <span
                          className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                          title="Đang trực tuyến"
                        />
                      )}
                    </div>

                    {/* Name, Summary, Time */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-extrabold text-[#155e59]">
                          {displayName}
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
                        {conv.commission.characterName && (
                          <span className="truncate text-[10px] font-semibold text-[#66736b]">
                            #{conv.commission.characterName}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="py-10 text-center text-xs text-[#7a8c80]">
                  Không tìm thấy hội thoại phù hợp.
                </div>
              )}
            </div>
          </section>

          {/* -----------------------------------------------------------------
              CỘT 2: KHUNG CHAT CHÍNH (50% CHIỀU RỘNG - CỘT GIỮA)
          ----------------------------------------------------------------- */}
          <section className="flex w-2/4 flex-1 flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
            {/* Header hiển thị thông tin người đang chat */}
            <div className="flex items-center justify-between border-b border-[#cfe3d0] bg-[#eaf5e8] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#155e59] text-xs font-black text-white">
                    {roleView === "CUSTOMER"
                      ? activeConversation.staffAvatar
                      : activeConversation.customerAvatar}
                  </div>
                  {activeConversation.online && (
                    <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#155e59]">
                    {roleView === "CUSTOMER"
                      ? activeConversation.staffName
                      : activeConversation.customerName}
                  </h2>
                  <p className="flex items-center gap-1.5 text-xs text-[#4b6758]">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        activeConversation.online ? "bg-emerald-500" : "bg-gray-400"
                      }`}
                    />
                    {activeConversation.online
                      ? "Đang trực tuyến • Phản hồi nhanh"
                      : "Ngoại tuyến"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-[#b7d9be] bg-[#fffdf7] px-3 py-1.5 text-xs font-bold text-[#155e59]">
                  Dự án: {activeConversation.commission.characterName || "Chưa đặt tên"}
                </span>
              </div>
            </div>

            {/* Vùng hiển thị tin nhắn (Chat timeline) */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfaf4] p-5">
              {activeConversation.messages.map((msg) => {
                // 1. SYSTEM ACTION CARD (Thẻ hệ thống báo giá chèn vào timeline)
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

                          <div className="rounded-xl border border-[#e6efe8] bg-[#f8f7ef] p-3 text-xs space-y-1.5">
                            <p className="text-[#495e52]">
                              <strong className="text-[#155e59]">Mô tả:</strong>{" "}
                              {card.description}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-[#e2e8e3]">
                              <span className="text-[#66736b]">Ngày giao dự kiến:</span>
                              <strong className="text-[#155e59]">
                                {card.deliveryDate}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#66736b]">Tổng chi phí:</span>
                              <strong className="text-sm font-black text-[#155e59]">
                                {formatVND(card.price)}
                              </strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
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
                    </div>
                  );
                }

                // 2. BONG BÓNG CHAT (TRÁI / PHẢI THEO GÓC NHÌN ĐANG XEM)
                const isOwnMessage = msg.sender === roleView;
                const senderLabel =
                  msg.sender === "CUSTOMER"
                    ? activeConversation.customerName
                    : activeConversation.staffName;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="mb-1 px-1 text-[10px] font-semibold text-[#7a8c80]">
                      {senderLabel} • {msg.time}
                    </span>
                    <div
                      className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                        isOwnMessage
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

            {/* Vùng nhập liệu (Input area): Ô nhập text, icon đính kèm ảnh, nút Gửi */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2.5 border-t border-[#dce8df] bg-white p-3.5"
            >
              <button
                type="button"
                onClick={handleAttachSampleImage}
                title="Đính kèm hình ảnh tham khảo"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cfe3d0] bg-[#f8f7ef] text-[#155e59] transition hover:bg-[#eaf5e8]"
              >
                <ImagePlus size={18} />
              </button>

              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={
                  roleView === "CUSTOMER"
                    ? "Nhập tin nhắn trao đổi ý tưởng nhân vật Pixel Art..."
                    : "Nhập tin nhắn tư vấn khách hàng..."
                }
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

          {/* -----------------------------------------------------------------
              CỘT 3: BẢNG THÔNG TIN & NGHIỆP VỤ (25% CHIỀU RỘNG - CỘT PHẢI)
          ----------------------------------------------------------------- */}
          <aside className="flex w-1/4 min-w-[270px] flex-col overflow-hidden rounded-xl border border-[#dce8df] bg-white shadow-sm">
            {/* Header Cột 3 */}
            <div className="border-b border-[#cfe3d0] bg-[#eaf5e8] px-4 py-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#155e59]">
                  Thông tin & Nghiệp vụ
                </h2>
                <span className="rounded-lg border border-[#8fc7a0] bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#155e59]">
                  {roleView === "STAFF" ? "Chế độ Staff" : "Chế độ Khách"}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#546d5e]">
                Quản lý tiến độ chốt đơn & nghiệm thu Commission
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* =============================================================
                  STATE 1: CHƯA CÓ ĐƠN (NO_ORDER)
              ============================================================= */}
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
                      {roleView === "STAFF"
                        ? "Sau khi thống nhất ý tưởng với khách hàng, hãy tạo Form Commission để gửi báo giá."
                        : "Nhân viên đang tư vấn ý tưởng cho bạn. Báo giá Commission sẽ sớm được tạo tại đây."}
                    </p>
                  </div>

                  {/* Nút to bản [ + Tạo Form Commission ] dành cho Staff */}
                  {roleView === "STAFF" ? (
                    <>
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
                              Tạo Form Báo Giá Commission
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
                              Mô tả chi tiết
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              placeholder="Kích thước pixel, số khung hình, màu sắc..."
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
                              Ngày giao dự kiến
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
                            className="w-full rounded-xl bg-[#155e59] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743]"
                          >
                            Gửi Thẻ Báo Giá Vào Chat
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#8fc7a0] bg-[#f4faf5] p-3.5 text-xs text-[#155e59]">
                      <p className="font-bold">Mẹo dành cho bạn:</p>
                      <p className="mt-1 text-[#4c6b5a]">
                        Bạn có thể chuyển sang{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setRoleView("STAFF");
                            setIsFormOpen(true);
                          }}
                          className="font-black text-[#155e59] underline"
                        >
                          Góc nhìn Nhân viên (Staff)
                        </button>{" "}
                        để bấm nút <strong>[ + Tạo Form Commission ]</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  STATE 2: ĐANG THỰC HIỆN (IN_PROGRESS)
              ============================================================= */}
              {activeConversation.orderState === "IN_PROGRESS" && (
                <div className="space-y-4">
                  {/* Thông tin đơn tóm tắt */}
                  <div className="rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#66736b] uppercase">
                        Đơn Commission
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
                      <span className="text-[#66736b]">Chi phí:</span>
                      <strong className="text-sm font-black text-[#155e59]">
                        {formatVND(activeConversation.commission.price)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#66736b]">Ngày giao:</span>
                      <strong className="text-[#26352f]">
                        {activeConversation.commission.deliveryDate}
                      </strong>
                    </div>
                  </div>

                  {/* Tiến độ đơn vẽ: Chờ thanh toán -> Đang vẽ -> Đang nghiệm thu */}
                  <div className="rounded-xl border border-[#dce8df] bg-white p-4 shadow-xs">
                    <h4 className="mb-3 text-xs font-black text-[#155e59] uppercase">
                      Tiến độ thực hiện đơn vẽ
                    </h4>

                    <div className="space-y-3">
                      {[
                        {
                          key: "WAITING_PAYMENT" as ProgressStep,
                          label: "1. Chờ thanh toán",
                          desc: "Khách hàng xác nhận báo giá và thanh toán",
                        },
                        {
                          key: "DRAWING" as ProgressStep,
                          label: "2. Đang vẽ",
                          desc: "Artist thiết kế nhân vật Pixel Art theo yêu cầu",
                        },
                        {
                          key: "REVIEWING" as ProgressStep,
                          label: "3. Đang nghiệm thu",
                          desc: "Gửi bản Preview có watermark để khách duyệt",
                        },
                      ].map((step, index) => {
                        const stepOrder: ProgressStep[] = [
                          "WAITING_PAYMENT",
                          "DRAWING",
                          "REVIEWING",
                        ];
                        const currentIdx = stepOrder.indexOf(
                          activeConversation.progressStep
                        );
                        const isDone = index < currentIdx;
                        const isCurrent = index === currentIdx;

                        return (
                          <div
                            key={step.key}
                            onClick={() => {
                              updateActiveConversation((c) => ({
                                ...c,
                                progressStep: step.key,
                                orderState:
                                  step.key === "REVIEWING" ? "REVIEW" : "IN_PROGRESS",
                              }));
                            }}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              isCurrent
                                ? "border-[#155e59] bg-[#eaf5e8]"
                                : isDone
                                ? "border-[#cfe3d0] bg-[#f8fbf8]"
                                : "border-[#e6ece7] bg-white opacity-70"
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
                            <div className="min-w-0 flex-1">
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

                    {/* Nút hành động phụ trợ theo bước */}
                    <div className="mt-4 pt-3 border-t border-[#e6efe8]">
                      {activeConversation.progressStep === "WAITING_PAYMENT" ? (
                        <button
                          type="button"
                          onClick={() => handlePayCommission()}
                          className="w-full rounded-xl bg-[#155e59] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743]"
                        >
                          Thanh toán ngay ({formatVND(activeConversation.commission.price)})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            updateActiveConversation((c) => ({
                              ...c,
                              orderState: "REVIEW",
                              progressStep: "REVIEWING",
                            }));
                            showToast(
                              "Đã chuyển sang giai đoạn Nghiệm thu (State 3) với ảnh Preview có Watermark!"
                            );
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#155e59] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f4743]"
                        >
                          <Eye size={15} />
                          Chuyển sang bước Nghiệm thu file
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  STATE 3: NGHIỆM THU - KHÁCH HÀNG NHẬN FILE (REVIEW)
              ============================================================= */}
              {activeConversation.orderState === "REVIEW" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#8fc7a0] bg-[#eaf5e8] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#155e59]">
                        Nghiệm thu bàn giao
                      </span>
                      <span className="rounded-full bg-[#155e59] px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Có Watermark
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#486355]">
                      Tác phẩm:{" "}
                      <strong>{activeConversation.commission.characterName}</strong> •{" "}
                      <strong>{formatVND(activeConversation.commission.price)}</strong>
                    </p>
                  </div>

                  {/* Ảnh Preview có Watermark */}
                  <WatermarkedPixelPreview
                    characterName={activeConversation.commission.characterName}
                  />

                  <div className="rounded-xl border border-[#dce8df] bg-[#f8f7ef] p-3 text-xs text-[#54655c]">
                    <p>
                      <strong className="text-[#155e59]">Lưu ý nghiệm thu:</strong> Bản
                      xem trước được gắn lớp bảo vệ <em>MIRAGE Watermark</em>. Sau khi bấm{" "}
                      <strong>Phê duyệt</strong>, hệ thống sẽ mở khóa file gốc `.PNG` &
                      `.GIF` không có watermark.
                    </p>
                  </div>

                  {/* 2 Nút hành động nghiệm thu bắt buộc */}
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
        </div>
      </div>

      {/* =====================================================================
          BUSINESS LOGIC: REVISION PAYWALL MODAL (POPUP CHẶN KHI YÊU CẦU SỬA)
      ===================================================================== */}
      {isRevisionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revision-modal-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#cfe3d0] bg-[#fffdf9] shadow-xl">
            {/* Modal Header */}
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
                    Đơn vẽ: {activeConversation.commission.characterName}
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

            {/* Modal Body */}
            <form onSubmit={handleSubmitRevisionPayment} className="space-y-4 p-5">
              {/* Dòng Text nổi bật tính toán chi phí */}
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-bold tracking-wide text-orange-800 uppercase">
                  Thông báo phí phát sinh chỉnh sửa
                </p>
                <p className="mt-1 text-base font-black text-[#c2410c]">
                  Phí chỉnh sửa: {formatVNDFull(revisionFee)} (10% của{" "}
                  {formatVNDFull(baseOrderPrice)})
                </p>
                <p className="mt-1 text-xs text-orange-900/80">
                  Phụ phí 10% giúp đảm bảo quyền lợi cho Artist khi chỉnh sửa lại các
                  khung hình Pixel Art ngoài phạm vi phác thảo ban đầu.
                </p>
              </div>

              {/* Textarea nhập yêu cầu chỉnh sửa */}
              <div>
                <label
                  htmlFor="revision-textarea"
                  className="block text-xs font-black text-[#155e59]"
                >
                  Chi tiết nội dung cần chỉnh sửa <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="revision-textarea"
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => {
                    setRevisionNote(e.target.value);
                    if (revisionError) setRevisionError("");
                  }}
                  placeholder="Nhập chi tiết các điểm bạn muốn Artist chỉnh sửa (ví dụ: đổi màu lửa sang xanh dương, tăng độ sáng phần vảy rồng...)"
                  className="mt-2 w-full rounded-xl border border-[#cfe3d0] bg-white p-3.5 text-sm text-[#26352f] outline-none placeholder:text-[#7a8c80] focus:border-[#155e59] focus:ring-2 focus:ring-[#8fc7a0]/40"
                />
                {revisionError && (
                  <p className="mt-1.5 text-xs font-bold text-red-600">{revisionError}</p>
                )}
              </div>

              {/* Modal Actions */}
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

      {/* Toast Notification */}
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

