"use client";

import { Check, CheckCheck, FileText, Image as ImageIcon, Paperclip, Plus, Send, X } from "lucide-react";
import { useState } from "react";
import { money, type Message, type Project, useCommissionChatStore } from "./mock-store";



const statusLabels: Record<Project["status"], string> = { NEW_REQUEST: "Yêu cầu mới", PENDING_PAYMENT: "Chờ thanh toán", IN_PROGRESS: "Đang thực hiện", REVIEWING: "Chờ nghiệm thu", COMPLETED: "Đã hoàn thành" };
const statusClasses: Record<Project["status"], string> = { NEW_REQUEST: "bg-amber-50 text-amber-700", PENDING_PAYMENT: "bg-orange-50 text-orange-700", IN_PROGRESS: "bg-blue-50 text-blue-700", REVIEWING: "bg-violet-50 text-violet-700", COMPLETED: "bg-emerald-50 text-emerald-700" };

function CustomerForm({ onSubmit }: { onSubmit: (title: string, description: string) => void }) {
  const [title, setTitle] = useState("");
  const [character, setCharacter] = useState("Nhân vật mới");
  const [animation, setAnimation] = useState("Nhân vật tĩnh");
  const [size, setSize] = useState("64x64");
  const [description, setDescription] = useState("");
  return <div className="h-full overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-2xl rounded-none border border-[#23261f]/30 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Dự án mới</p><h2 className="mt-2 text-2xl font-black text-gray-900">Gửi yêu cầu commission</h2><p className="mt-2 text-sm text-gray-500">Hãy mô tả ý tưởng để nhân viên tư vấn và gửi báo giá cho bạn.</p><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-bold">Tên dự án<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Rồng Lửa Pixel" className="mt-2 w-full rounded-none border border-[#23261f]/30 px-3 py-3 font-normal outline-none focus:border-emerald-600" /></label><label className="text-sm font-bold">Loại nhân vật<select value={character} onChange={(e) => setCharacter(e.target.value)} className="mt-2 w-full rounded-none border border-[#23261f]/30 bg-white px-3 py-3 font-normal"><option>Nhân vật mới</option><option>Thiết kế lại</option><option>Nhân vật có sẵn</option></select></label><label className="text-sm font-bold">Hoạt ảnh<select value={animation} onChange={(e) => setAnimation(e.target.value)} className="mt-2 w-full rounded-none border border-[#23261f]/30 bg-white px-3 py-3 font-normal"><option>Nhân vật tĩnh</option><option>Hoạt ảnh đơn giản</option><option>Hoạt ảnh nhiều khung hình</option></select></label><label className="text-sm font-bold">Kích thước LED<select value={size} onChange={(e) => setSize(e.target.value)} className="mt-2 w-full rounded-none border border-[#23261f]/30 bg-white px-3 py-3 font-normal"><option>32x32</option><option>32x64</option><option>64x64</option></select></label><label className="sm:col-span-2 text-sm font-bold">Mô tả ý tưởng<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Màu sắc, phong cách, hiệu ứng và các chi tiết bạn mong muốn..." className="mt-2 w-full resize-none rounded-none border border-[#23261f]/30 px-3 py-3 font-normal outline-none focus:border-emerald-600" /></label></div><button disabled={!title.trim() || !description.trim()} onClick={() => onSubmit(title.trim(), `${character}; ${animation}; LED ${size}. ${description.trim()}`)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-none border-2 border-[#23261f] bg-[#86d095] px-4 py-3 font-bold text-[#23261f] hover:bg-[#7fc89e] disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /> Gửi yêu cầu tư vấn</button></div></div>;
}

function RevisionModal({ project, onClose, onPay }: { project: Project; onClose: () => void; onPay: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="relative w-full max-w-md rounded-none bg-white p-6 shadow-xl"><button onClick={onClose} className="absolute right-4 top-4 text-gray-400" aria-label="Đóng"><X size={19} /></button><h2 className="text-xl font-black">Yêu cầu sửa bản vẽ</h2><p className="mt-2 text-sm text-gray-500">Nêu rõ nội dung cần chỉnh sửa cho designer.</p><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Lý do chỉnh sửa..." className="mt-5 w-full resize-none rounded-none border border-[#23261f]/30 p-3 text-sm outline-none focus:border-emerald-600" /><div className="mt-4 rounded-none bg-orange-50 p-4 text-sm font-bold text-orange-800">Phí: 10% <span className="float-right">{money(project.basePrice * .1)}</span></div><button disabled={!reason.trim()} onClick={() => onPay(reason.trim())} className="mt-4 w-full rounded-none border-2 border-[#23261f] bg-[#86d095] px-4 py-3 text-sm font-bold text-[#23261f] disabled:opacity-50">Mô phỏng thanh toán phí sửa</button></div></div>;
}

function Chat({ project, messages, onPay, onApprove, onRevision, onSend }: { project: Project; messages: Message[]; onPay: () => void; onApprove: () => void; onRevision: () => void; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const send = () => { if (draft.trim()) { onSend(draft.trim()); setDraft(""); } };
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fffdf7]"><header className="border-b border-[#23261f]/30 bg-white px-5 py-5"><h2 className="font-black">{project.title} <span className="font-normal text-gray-400">#{project.id}</span></h2><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[project.status]}`}>{statusLabels[project.status]}</span></header><div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="mx-auto max-w-3xl space-y-4">{messages.map((message) => message.messageType === "QUOTE_CARD" ? <div key={message.id} className="max-w-sm rounded-none border border-amber-200 bg-amber-50 p-4"><p className="font-bold">Staff đã gửi báo giá</p><p className="mt-2 text-2xl font-black text-amber-700">{money(Number(message.content))}</p>{project.status === "PENDING_PAYMENT" && <button onClick={onPay} className="mt-3 w-full rounded-none border-2 border-[#23261f] bg-[#86d095] px-3 py-2 text-sm font-bold text-[#23261f]">Mô phỏng thanh toán</button>}</div> : message.messageType === "DELIVERY_CARD" ? <div key={message.id} className="max-w-md rounded-none border border-emerald-200 bg-white p-4"><p className="font-bold">Staff đã giao file nghiệm thu</p><div className="relative mt-3 flex h-32 items-center justify-center overflow-hidden rounded-none bg-gradient-to-br from-orange-300 via-red-500 to-emerald-800"><span className="text-4xl">🐉</span><b className="absolute rotate-[-18deg] text-xl text-[#23261f]/40">WATERMARK</b></div>{project.status === "REVIEWING" && <div className="mt-3 flex gap-2"><button onClick={onApprove} className="flex-1 rounded-none border-2 border-[#23261f] bg-[#86d095] px-2 py-2 text-xs font-bold text-[#23261f]"><Check size={14} className="mr-1 inline" />Phê duyệt</button><button onClick={onRevision} className="flex-1 rounded-none bg-red-50 px-2 py-2 text-xs font-bold text-red-700">Yêu cầu sửa (+10% phí)</button></div>}</div> : message.messageType === "NEW_REQUEST_CARD" ? <div key={message.id} className="mx-auto max-w-md rounded-none border border-[#23261f]/30 bg-white p-3 text-center text-xs text-gray-500">{message.content}</div> : <div key={message.id} className={`flex ${message.senderType === "CUSTOMER" ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-none px-4 py-3 text-sm ${message.senderType === "CUSTOMER" ? "border-2 border-[#23261f] bg-[#86d095] text-[#23261f]" : "border border-[#23261f]/30 bg-white text-gray-700"}`}>{message.content}<span className="mt-1 flex items-center gap-1 text-[10px] opacity-60">{message.timestamp}{message.senderType === "CUSTOMER" && <CheckCheck size={12} />}</span></div></div>)}</div></div><div className="border-t border-[#23261f]/30 bg-white p-3"><div className="mx-auto flex max-w-3xl items-end gap-2 rounded-none border border-[#23261f]/30 bg-gray-50 p-2"><div className="flex-1"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Viết tin nhắn..." className="w-full resize-none bg-transparent p-1 text-sm outline-none" /><div className="flex gap-2 text-gray-400"><ImageIcon size={16} /><Paperclip size={16} /><FileText size={16} /></div></div><button onClick={send} className="rounded-none border-2 border-[#23261f] bg-[#86d095] p-3 text-[#23261f]" aria-label="Gửi"><Send size={16} /></button></div></div></section>;
}


export default function CustomerCommissionPage() {
  const { projects, messages, addProject, addMessage, updateProject } = useCommissionChatStore();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revisionProject, setRevisionProject] = useState<Project | null>(null);
  const selectedProject = projects.find((project) => project.id === selectedId) ?? projects[0];
  const selectedMessages = messages.filter((message) => message.projectId === selectedProject?.id);
  const createProject = (title: string, description: string) => { const id = `COM-${crypto.randomUUID().slice(0, 8)}`; addProject({ id, title, customerName: "Nguyễn Minh Anh", status: "NEW_REQUEST", basePrice: 500000 }, { id: `${id}-msg`, projectId: id, senderType: "SYSTEM", messageType: "NEW_REQUEST_CARD", content: `Yêu cầu mới: ${description}`, timestamp: "Bây giờ" }); setSelectedId(id); setCreating(false); };
  const addText = (content: string) => { if (selectedProject) addMessage({ id: crypto.randomUUID(), projectId: selectedProject.id, senderType: "CUSTOMER", messageType: "TEXT", content, timestamp: "Bây giờ" }); };
  const quote = selectedMessages.slice().reverse().find((message) => message.messageType === "QUOTE_CARD");
  const brief = selectedMessages.find((message) => message.messageType === "NEW_REQUEST_CARD");
  const frame = "border-2 border-[#23261f] bg-white shadow-[4px_4px_0_#23261f]";

  return (
    <main className="min-h-screen bg-[#fffdf7] text-[#23261f]">
      <div className="border-y-2 border-[#23261f] bg-[#23261f] px-4 py-2 font-mono text-xs text-[#fffdf7]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <span className="bg-[#86d095] px-2 py-0.5 font-bold text-[#23261f]">FLOW 3 DEMO</span>
          <span>Cổng Commission dành cho khách hàng</span>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b-2 border-[#23261f] pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl"><span className="box-decoration-clone bg-[#86d095] px-1">Thiết kế Character theo yêu cầu</span></h1>
            <p className="mt-3 font-mono text-xs">Gửi brief, nhận báo giá qua chat và duyệt bản vẽ pixel cho bảng LED.</p>
          </div>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 border-2 border-[#23261f] bg-[#86d095] px-4 py-2.5 text-sm font-extrabold shadow-[4px_4px_0_#23261f] hover:bg-[#7fc89e]"><Plus size={16} /> Yêu cầu thiết kế mới</button>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <aside className="space-y-3 font-mono lg:col-span-3">
            <h2 className="border-b-2 border-[#23261f] pb-1 text-xs font-extrabold uppercase">Yêu cầu của tôi ({projects.length})</h2>
            {projects.map((project) => (
              <button key={project.id} aria-pressed={selectedProject?.id === project.id} onClick={() => setSelectedId(project.id)} className={`w-full border-2 border-[#23261f] p-3 text-left ${selectedProject?.id === project.id ? "bg-[#86d095] shadow-[4px_4px_0_#23261f]" : "bg-white hover:bg-[#e4f4e7]"}`}>
                <span className="block text-[10px] font-bold">{project.id}</span>
                <span className="mt-1 block break-words text-sm font-extrabold">{project.title}</span>
                <span className={`mt-2 inline-block border border-[#23261f] px-1.5 py-0.5 text-[10px] font-bold ${statusClasses[project.status]}`}>{statusLabels[project.status]}</span>
                <span className="mt-2 flex justify-between gap-2 border-t border-[#23261f]/25 pt-2 text-[10px]"><span>Tổng tiền</span><strong>{project.status === "NEW_REQUEST" ? "Chờ báo giá" : money(project.basePrice)}</strong></span>
              </button>
            ))}
          </aside>

          {selectedProject ? (
            <>
              <section className={`${frame} min-w-0 font-mono lg:col-span-4`}>
                <h2 className="border-b-2 border-[#23261f] bg-[#365444] px-3 py-2 text-xs font-bold text-[#fffdf7]">{selectedProject.id} · Brief thiết kế</h2>
                <div className="space-y-4 p-4 text-xs">
                  <h3 className="break-words text-base font-extrabold">{selectedProject.title}</h3>
                  <p className="break-words">{brief?.content ?? "Chưa có mô tả."}</p>
                  <dl className="space-y-2 border-t border-[#23261f]/25 pt-3">
                    <div className="flex justify-between gap-2"><dt>Trạng thái</dt><dd className="font-bold">{statusLabels[selectedProject.status]}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Báo giá</dt><dd className="font-bold">{quote ? money(Number(quote.content)) : "Đang chờ"}</dd></div>
                  </dl>
                </div>
              </section>
              <div className={`${frame} flex h-[36rem] min-w-0 flex-col overflow-hidden lg:col-span-5`}>
                <h2 className="border-b-2 border-[#23261f] bg-[#86d095] px-3 py-2 font-mono text-xs font-extrabold">Trao đổi và báo giá</h2>
                <Chat key={selectedProject.id} project={selectedProject} messages={selectedMessages} onPay={() => {
                  updateProject(selectedProject.id, { status: "IN_PROGRESS" });
                  addMessage({ id: crypto.randomUUID(), projectId: selectedProject.id, senderType: "SYSTEM", messageType: "TEXT", content: "Đã mô phỏng thanh toán báo giá.", timestamp: "Bây giờ" });
                }} onApprove={() => updateProject(selectedProject.id, { status: "COMPLETED" })} onRevision={() => setRevisionProject(selectedProject)} onSend={addText} />
              </div>
            </>
          ) : (
            <p className={`${frame} p-5 text-sm lg:col-span-9`}>Chưa có yêu cầu. Tạo yêu cầu thiết kế để bắt đầu.</p>
          )}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <section role="dialog" aria-modal="true" aria-label="Yêu cầu thiết kế mới" className={`${frame} relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto bg-[#fffdf7]`}>
            <button onClick={() => setCreating(false)} className="absolute right-4 top-4 z-10 border-2 border-[#23261f] bg-white p-1.5" aria-label="Đóng"><X size={18} /></button>
            <CustomerForm onSubmit={createProject} />
          </section>
        </div>
      )}
      {revisionProject && <RevisionModal project={revisionProject} onClose={() => setRevisionProject(null)} onPay={(reason) => {
        updateProject(revisionProject.id, { status: "IN_PROGRESS" });
        addMessage({ id: crypto.randomUUID(), projectId: revisionProject.id, senderType: "CUSTOMER", messageType: "TEXT", content: `Đã mô phỏng thanh toán phí sửa. Lý do: ${reason}`, timestamp: "Bây giờ" });
        setRevisionProject(null);
      }} />}
    </main>
  );
}
