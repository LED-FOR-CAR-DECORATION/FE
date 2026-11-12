"use client";

import {
  Check,
  CheckCheck,
  ChevronLeft,
  Clock3,
  Download,
  File,
  Image as ImageIcon,
  Menu,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ProjectStatus = "Đang vẽ" | "Chờ thanh toán" | "Đã hoàn thành" | "Yêu cầu sửa";

type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  preview: string;
  lastMessage: string;
  time: string;
  staff: string;
  staffInitials: string;
};

type Message = {
  id: string;
  sender: "staff" | "customer" | "system";
  name?: string;
  time: string;
  text?: string;
  kind?: "quote" | "delivery";
};

const BASE_PRICE = 500000;
const REVISION_FEE = BASE_PRICE * 0.1;

const INITIAL_PROJECTS: Project[] = [
  {
    id: "COM-1024",
    title: "Thiết kế Rồng Lửa Pixel",
    status: "Đang vẽ",
    preview: "Bản phác thảo đã được duyệt...",
    lastMessage: "10:42",
    time: "Hôm nay",
    staff: "Nguyễn Văn A",
    staffInitials: "NA",
  },
  {
    id: "COM-1018",
    title: "Cáo tuyết phi hành gia",
    status: "Chờ thanh toán",
    preview: "Staff đã gửi báo giá mới",
    lastMessage: "Hôm qua",
    time: "Hôm qua",
    staff: "Trần Minh K",
    staffInitials: "TK",
  },
  {
    id: "COM-0996",
    title: "Bộ nhân vật mùa hè",
    status: "Đã hoàn thành",
    preview: "Đã tải xuống file nghiệm thu",
    lastMessage: "12/05",
    time: "12/05",
    staff: "Lê Hoàng B",
    staffInitials: "LB",
  },
  {
    id: "COM-0981",
    title: "Hiệu ứng pháo hoa",
    status: "Yêu cầu sửa",
    preview: "Mình đã gửi thêm ghi chú chỉnh sửa",
    lastMessage: "08/05",
    time: "08/05",
    staff: "Nguyễn Văn A",
    staffInitials: "NA",
  },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "system",
    time: "09:12",
    text: "Yêu cầu thiết kế đã được tạo. Nhân viên Nguyễn Văn A sẽ hỗ trợ bạn trong dự án này.",
  },
  {
    id: "m2",
    sender: "customer",
    name: "Bạn",
    time: "09:25",
    text: "Mình muốn nhân vật rồng có màu đỏ cam, thêm hiệu ứng lửa quanh cánh và giữ phong cách pixel 16-bit nhé.",
  },
  {
    id: "m3",
    sender: "staff",
    name: "Nguyễn Văn A",
    time: "09:40",
    text: "Mình đã ghi chú lại yêu cầu. Designer sẽ gửi bản phác thảo đầu tiên trong hôm nay để bạn duyệt trước khi lên màu.",
  },
  {
    id: "m4",
    sender: "customer",
    name: "Bạn",
    time: "10:03",
    text: "Tuyệt vời, mình chờ bản phác thảo nhé!",
  },
  {
    id: "m5",
    sender: "system",
    time: "10:20",
    kind: "quote",
  },
  {
    id: "m6",
    sender: "staff",
    name: "Nguyễn Văn A",
    time: "10:35",
    text: "Bản phác thảo đã được duyệt và designer đang hoàn thiện phần màu. Dự kiến giao file nghiệm thu vào chiều nay.",
  },
  {
    id: "m7",
    sender: "system",
    time: "10:42",
    kind: "delivery",
  },
];

function statusStyle(status: ProjectStatus) {
  if (status === "Đang vẽ") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "Chờ thanh toán") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "Đã hoàn thành") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-red-50 text-red-700 ring-red-100";
}

function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 ${
        small ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs"
      }`}
    >
      {initials}
    </span>
  );
}

function ProjectSidebar({
  projects,
  selectedId,
  onSelect,
  onNewRequest,
  mobileOpen,
  onClose,
}: {
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNewRequest: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={`absolute inset-y-0 left-0 z-30 flex w-[min(88vw,360px)] flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:relative lg:w-[30%] lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Không gian sáng tạo</p>
          <h1 className="mt-1 text-lg font-bold text-gray-900">Thiết kế của tôi</h1>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="Đóng danh sách dự án">
          <X size={20} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={onNewRequest}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          <Plus size={18} />
          Yêu cầu thiết kế mới
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Dự án của bạn</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{projects.length}</span>
        </div>
        <div className="space-y-1">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => { onSelect(project.id); onClose(); }}
              className={`w-full rounded-xl border-l-4 p-3 text-left transition ${
                selectedId === project.id
                  ? "border-emerald-700 bg-emerald-50 shadow-sm"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-300 via-red-400 to-emerald-700 text-sm font-black text-white">
                  {project.title.slice(9, 11)}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-bold text-gray-800">{project.title}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{project.lastMessage}</span>
                  </span>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusStyle(project.status)}`}>
                    {project.status}
                  </span>
                  <span className="mt-1 block truncate text-xs text-gray-500">{project.preview}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function QuoteCard({ onPay }: { onPay: () => void }) {
  return (
    <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700"><Sparkles size={18} /></span>
        <div>
          <p className="text-sm font-bold text-gray-900">Staff đã gửi một báo giá</p>
          <p className="mt-1 text-xs text-gray-600">Báo giá cho thiết kế Rồng Lửa Pixel</p>
          <p className="mt-2 text-xl font-black text-amber-700">500.000đ</p>
        </div>
      </div>
      <button onClick={onPay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">
        Thanh toán ngay <ChevronLeft className="rotate-180" size={16} />
      </button>
    </div>
  );
}

function DeliveryCard({ onApprove, onRevision }: { onApprove: () => void; onRevision: () => void }) {
  return (
    <div className="max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Download size={18} /></span>
        <div>
          <p className="text-sm font-bold text-gray-900">Designer đã giao file nghiệm thu</p>
          <p className="mt-1 text-xs text-gray-500">Vui lòng kiểm tra bản xem trước trước khi tải file gốc.</p>
        </div>
      </div>
      <div className="relative mt-4 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-300 via-red-500 to-emerald-800">
        <div className="grid h-20 w-20 place-items-center border-4 border-white/80 bg-orange-400 text-3xl shadow-lg">🐉</div>
        <span className="absolute rotate-[-18deg] text-2xl font-black tracking-[0.25em] text-white/40">WATERMARK</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button onClick={onApprove} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-800">
          <Check size={15} /> Phê duyệt &amp; Tải file
        </button>
        <button onClick={onRevision} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100">
          Yêu cầu sửa (+10% phí)
        </button>
      </div>
    </div>
  );
}

function ChatArea({
  project,
  messages,
  onPay,
  onRevision,
  onMenu,
  onSend,
}: {
  project: Project;
  messages: Message[];
  onPay: () => void;
  onRevision: () => void;
  onMenu: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
      <header className="flex min-h-[76px] items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <button onClick={onMenu} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Mở danh sách dự án"><Menu size={21} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">{project.title}</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">{project.status}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Mã yêu cầu #{project.id}</p>
        </div>
        <div className="hidden items-center gap-2 border-l border-gray-100 pl-4 sm:flex">
          <Avatar initials={project.staffInitials} small />
          <div>
            <p className="text-[11px] text-gray-500">Nhân viên hỗ trợ</p>
            <p className="text-xs font-bold text-gray-800">{project.staff}</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="flex justify-center"><span className="rounded-full bg-gray-200 px-3 py-1 text-[10px] font-semibold text-gray-500">Hôm nay</span></div>
          {messages.map((message) => {
            if (message.kind === "quote") return <QuoteCard key={message.id} onPay={onPay} />;
            if (message.kind === "delivery") return <DeliveryCard key={message.id} onApprove={() => window.alert("File gốc sẽ được tải xuống sau khi xác nhận thanh toán.")} onRevision={onRevision} />;
            if (message.sender === "system") {
              return <div key={message.id} className="mx-auto flex max-w-lg items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 shadow-sm"><Clock3 size={15} className="shrink-0 text-emerald-600" />{message.text}</div>;
            }
            const isCustomer = message.sender === "customer";
            return (
              <div key={message.id} className={`flex items-end gap-2 ${isCustomer ? "justify-end" : "justify-start"}`}>
                {!isCustomer && <Avatar initials={project.staffInitials} small />}
                <div className={`max-w-[85%] sm:max-w-[70%] ${isCustomer ? "items-end" : "items-start"} flex flex-col`}>
                  <span className="mb-1 px-1 text-[10px] font-semibold text-gray-400">{message.name}</span>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isCustomer ? "rounded-br-md bg-emerald-700 text-white" : "rounded-bl-md border border-gray-200 bg-white text-gray-700 shadow-sm"}`}>{message.text}</div>
                  <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400">{message.time}{isCustomer && <CheckCheck size={13} className="text-emerald-500" />}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
            rows={2}
            placeholder="Viết tin nhắn cho nhân viên..."
            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <div className="flex gap-1">
              <button className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-emerald-700" aria-label="Đính kèm ảnh"><ImageIcon size={18} /></button>
              <button className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-emerald-700" aria-label="Đính kèm file"><Paperclip size={18} /></button>
              <span className="hidden items-center gap-1 px-2 text-[10px] text-gray-400 sm:flex"><File size={13} /> JPG, PNG, PDF tối đa 10MB</span>
            </div>
            <button onClick={submit} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"><Send size={15} /> Gửi</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Đóng"><X size={19} /></button>
        {children}
      </div>
    </div>
  );
}

function RevisionModal({ onClose }: { onClose: () => void }) {
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = () => {
    if (!request.trim()) return;
    setLoading(true);
    window.setTimeout(onClose, 900);
  };
  return (
    <ModalShell onClose={onClose}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Điều chỉnh bản vẽ</p>
      <h2 className="mt-2 text-xl font-black text-gray-900">Yêu cầu chỉnh sửa bản vẽ</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">Bạn có thể gửi yêu cầu chỉnh sửa một lần cho bản nghiệm thu này. Phí chỉnh sửa được thanh toán trước khi chuyển đến designer.</p>
      <label className="mt-5 block text-sm font-bold text-gray-800">
        Bạn muốn chỉnh sửa chi tiết nào?
        <textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={5} placeholder="Ví dụ: Làm màu đỏ của cánh sáng hơn..." className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
      </label>
      <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-orange-900">Phí chỉnh sửa</span>
          <strong className="text-lg text-orange-700">50.000 VNĐ</strong>
        </div>
        <p className="mt-1 text-xs text-orange-700/80">10% của 500.000 VNĐ</p>
      </div>
      <button disabled={!request.trim() || loading} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Đang xử lý...</> : "Thanh toán 50.000đ để Gửi yêu cầu"}
      </button>
    </ModalShell>
  );
}

function NewCommissionModal({ onClose, onCreated }: { onClose: () => void; onCreated: (title: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return (
    <ModalShell onClose={onClose}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Bắt đầu dự án mới</p>
      <h2 className="mt-2 text-xl font-black text-gray-900">Yêu cầu thiết kế mới</h2>
      <p className="mt-2 text-sm text-gray-500">Mô tả ý tưởng của bạn để đội ngũ Pixel Hub tư vấn nhanh hơn.</p>
      <label className="mt-5 block text-sm font-bold text-gray-800">Tên dự án<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Hiệp sĩ ánh trăng" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="mt-4 block text-sm font-bold text-gray-800">Mô tả ý tưởng<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Phong cách, màu sắc, hiệu ứng bạn mong muốn..." className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
      <button disabled={!title.trim() || !description.trim()} onClick={() => { onCreated(title.trim()); onClose(); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} /> Gửi yêu cầu tư vấn</button>
    </ModalShell>
  );
}

export default function CommissionWorkspace() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_PROJECTS[0].id);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedId) ?? projects[0], [projects, selectedId]);

  const sendMessage = (text: string) => {
    setMessages((current) => [...current, { id: `m-${Date.now()}`, sender: "customer", name: "Bạn", time: "Bây giờ", text }]);
  };

  const createProject = (title: string) => {
    const project: Project = { id: `COM-${Math.floor(1000 + Math.random() * 8999)}`, title, status: "Chờ thanh toán", preview: "Yêu cầu mới vừa được tạo", lastMessage: "Bây giờ", time: "Bây giờ", staff: "Đội ngũ Pixel Hub", staffInitials: "PH" };
    setProjects((current) => [project, ...current]);
    setSelectedId(project.id);
    setMessages([{ id: "new-1", sender: "system", time: "Bây giờ", text: "Yêu cầu thiết kế đã được tạo. Nhân viên sẽ phản hồi bạn sớm nhất." }]);
  };

  return (
    <main className="h-[calc(100vh-104px)] min-h-[560px] overflow-hidden bg-gray-50">
      <div className="relative flex h-full">
        {mobileOpen && <button className="fixed inset-0 z-20 bg-gray-900/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Đóng danh sách dự án" />}
        <ProjectSidebar projects={projects} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setMessages(INITIAL_MESSAGES); }} onNewRequest={() => setNewRequestOpen(true)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <ChatArea project={selectedProject} messages={messages} onPay={() => window.alert("Bạn sẽ được chuyển đến bước thanh toán VNPay.")} onRevision={() => setRevisionOpen(true)} onMenu={() => setMobileOpen(true)} onSend={sendMessage} />
      </div>
      {revisionOpen && <RevisionModal onClose={() => setRevisionOpen(false)} />}
      {newRequestOpen && <NewCommissionModal onClose={() => setNewRequestOpen(false)} onCreated={createProject} />}
    </main>
  );
}
