"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { loadConversations, saveConversations } from "@/features/commission-chat/services/commission-chat.service";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { COMMISSION_FRAME_PRICE, commissionTotal, formatCommissionMoney, type CommissionDesign } from "../config/fixedPricing";
import {
  CommissionActions, CommissionBrief, CommissionDesignPicker, CommissionPayment,
  commissionButton,
} from "./FixedCommissionSteps";

import { CommissionProgress, commissionStages } from "./CommissionProgress";
import motion from "./CommissionMotion.module.css";
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function FixedCommissionFlow({ onConversationCreated }: { onConversationCreated?: (code: string) => void }) {
  const [{ stage, direction }, setProgress] = useState({ stage: 0, direction: "forward" });
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stage !== 0 || direction === "back") heading.current?.focus();
  }, [stage, direction]);

  function goToStage(next: number) {
    setProgress({ stage: next, direction: next < stage ? "back" : "forward" });
  }
  const [design, setDesign] = useState<CommissionDesign>({
    size: "32x32", format: "image", frames: "8", detail: "Cơ bản", background: "Trong suốt",
    artStyle: "", framing: "", characterCount: "1", palette: "", pose: "",
    subject: "Nhân vật", outline: "Không viền",
  });
  const [note, setNote] = useState("");
  const [expression, setExpression] = useState("");
  const [essentialDetails, setEssentialDetails] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<{ code: string; amount: number; userId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.role === "CUSTOMER" ? user.userId : undefined;
  const amount = commissionTotal(design);

  function addReferences(files: File[]) {
    setError("");
    if (files.length + references.length > 5) {
      setError("Bạn có thể chọn tối đa 5 ảnh tham khảo.");
      return;
    }
    if (files.some((file) => !imageTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Chọn ảnh JPG, PNG, WEBP hoặc GIF không quá 5 MB mỗi ảnh.");
      return;
    }
    setReferences((current) => [...current, ...files]);
  }

  function openCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim() || amount === null) return;
    if (!userId) {
      setError("Bạn cần đăng nhập bằng tài khoản khách hàng.");
      return;
    }
    setCheckout({ userId, code: `CM${crypto.randomUUID().slice(0, 8).toUpperCase()}`, amount });
    goToStage(2);
  }

  function openConversation() {
    if (!checkout || checkout.userId !== userId) return;
    const previous = loadConversations();
    const text = "Đã xác nhận thanh toán SePay mô phỏng.";
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (!previous.some((item) => item.id === checkout.code)) {
      saveConversations([{
        id: checkout.code,
        customerUserId: checkout.userId,
        customerName: "Bạn",
        customerAvatar: "",
        staffName: "Hỗ trợ Commission",
        staffAvatar: "",
        online: false,
        lastMessage: text,
        lastTime: time,
        orderState: "IN_PROGRESS",
        progressStep: "DRAWING",
        commission: {
          characterName: "Commission " + checkout.code,
          description: [
            note.trim(),
            expression.trim() && `Biểu cảm và tư thế: ${expression.trim()}`,
            essentialDetails.trim() && `Chi tiết giữ hoặc lược bỏ: ${essentialDetails.trim()}`,
          ].filter(Boolean).join("\n"),
          price: checkout.amount,
          deliveryDate: "Chưa xác định",
          isPaid: true,
          selections: {
            size: design.size, format: design.format, detail: design.detail, background: design.background,
            artStyle: design.artStyle, framing: design.framing, characterCount: design.characterCount,
            palette: design.palette, pose: design.pose, subject: design.subject, outline: design.outline,
            ...(design.format === "gif" && { frames: design.frames }),
          },
        },
        messages: [{ id: checkout.code + "-paid", sender: "SYSTEM", text, time }],
      }, ...previous]);
    }
    if (onConversationCreated) onConversationCreated(checkout.code);
    else router.push("/chat#" + checkout.code);
  }

  return (
    <div className="min-w-0 flex-1 space-y-5">
      <h1 className="text-3xl font-black text-[#155e59]">Yêu cầu thiết kế Pixel Art</h1>
      <CommissionProgress stage={stage} />
      <section key={stage} aria-labelledby="commission-step-heading" data-direction={direction}
        className={`${motion.step} space-y-5 rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] p-5 shadow-sm sm:p-7`}>
        <h2 id="commission-step-heading" ref={heading} tabIndex={-1} className="text-xl font-bold text-[#155e59]">{commissionStages[stage]}</h2>
        {stage === 0 && (
          <>
            <CommissionDesignPicker design={design} onChange={setDesign} />
            <aside aria-label="Tóm tắt giá" className="rounded-lg border border-[#cfe3d0] bg-white p-4">
              <h3 className="font-semibold">Tóm tắt giá</h3>
              <p className="mt-1 text-sm">
                {design.format === "gif"
                  ? `${formatCommissionMoney(COMMISSION_FRAME_PRICE)} / frame${amount !== null ? ` × ${design.frames} frame` : ""}`
                  : `Ảnh tĩnh · ${design.size.replace("x", " × ")}`}
              </p>
              <p aria-live="polite" className="mt-2 text-lg font-bold">
              {amount === null ? "Nhập số frame hợp lệ để tính giá." : <span key={amount} className={motion.price}>Tổng tiền {formatCommissionMoney(amount)}</span>}
              </p>
            </aside>
            <CommissionActions>
              <button className={commissionButton} disabled={amount === null} onClick={() => goToStage(1)}>
                Tiếp tục nhập brief
              </button>
            </CommissionActions>
          </>
        )}
        {stage === 1 && (
          <form onSubmit={openCheckout} className="space-y-5">
            <p className="font-semibold">{design.size.replace("x", " × ")} · {design.format === "gif" ? `GIF · ${design.frames} frame` : "Ảnh tĩnh"} · {amount !== null && formatCommissionMoney(amount)}</p>
            <p className="text-sm">Đối tượng: {design.subject} · Độ chi tiết: {design.detail} · Phông nền: {design.background} · {design.outline}</p>
            <p className="text-sm">
              {[design.artStyle, design.framing, design.palette, design.pose, `${design.characterCount} nhân vật`].filter(Boolean).join(" · ")}
            </p>
            <label className="block">
              Biểu cảm và tư thế (tùy chọn)
              <input className="mt-1 block w-full rounded-lg border border-[#819e8c] bg-white p-2.5" value={expression}
                onChange={(event) => setExpression(event.target.value)} maxLength={250}
                placeholder="Ví dụ: cười và giơ ngón cái" />
            </label>
            <label className="block">
              Chi tiết cần giữ hoặc có thể lược bỏ (tùy chọn)
              <input className="mt-1 block w-full rounded-lg border border-[#819e8c] bg-white p-2.5" value={essentialDetails}
                onChange={(event) => setEssentialDetails(event.target.value)} maxLength={250}
                placeholder="Ví dụ: giữ kính râm và tóc đỏ, bỏ họa tiết áo nhỏ" />
            </label>
            <CommissionBrief note={note} onNote={setNote} references={references} onFiles={addReferences}
              onRemove={(index) => {
                setReferences((current) => current.filter((_, position) => position !== index));
                setError("");
              }} error={error} />
            <CommissionActions>
              <button type="button" onClick={() => goToStage(0)}>Quay lại thiết kế</button>
              <button className={commissionButton} disabled={!note.trim()}>Tiếp tục thanh toán</button>
            </CommissionActions>
          </form>
        )}
        {stage === 2 && checkout && checkout.userId === userId && (
          <CommissionPayment {...checkout} onBack={() => goToStage(1)} onPay={openConversation} />
        )}
      </section>
    </div>
  );
}
