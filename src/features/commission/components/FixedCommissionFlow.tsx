"use client";

import { useState, type FormEvent } from "react";
import { commissionTotal, formatCommissionMoney, type CommissionDesign } from "../config/fixedPricing";
import {
  CommissionActions, CommissionBrief, CommissionChatBox, CommissionDesignPicker, CommissionPayment,
  commissionButton,
} from "./FixedCommissionSteps";

const stages = ["Thiết kế", "Brief", "Thanh toán", "Chat"];
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function FixedCommissionFlow() {
  const [stage, setStage] = useState(0);
  const [design, setDesign] = useState<CommissionDesign>({ size: "32x32", format: "image", frames: "8" });
  const [note, setNote] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<{ code: string; amount: number }>();
  const [messages, setMessages] = useState<string[]>([]);
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
    setCheckout({ code: `CM${crypto.randomUUID().slice(0, 8).toUpperCase()}`, amount });
    setStage(2);
  }

  return (
    <div className="min-w-0 flex-1 space-y-5">
      <h1 className="text-3xl font-black text-[#155e59]">Yêu cầu thiết kế Pixel Art</h1>
      <ol aria-label="Các bước đặt thiết kế" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {stages.map((label, index) => (
          <li key={label} aria-current={stage === index ? "step" : undefined}
            className={`rounded-lg px-3 py-2 ${stage === index ? "bg-[#155e59] font-semibold text-white" : "bg-white"}`}>
            {label}
          </li>
        ))}
      </ol>
      <section aria-label={stages[stage]} className="space-y-5 rounded-xl border border-[#cfe3d0] bg-[#eaf5e8] p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold text-[#155e59]">{stages[stage]}</h2>
        {stage === 0 && (
          <>
            <CommissionDesignPicker design={design} onChange={setDesign} />
            <p aria-live="polite" className="text-lg font-bold">
              {amount === null ? "Nhập số frame hợp lệ để tính giá." : `Tổng tiền ${formatCommissionMoney(amount)}`}
            </p>
            <CommissionActions>
              <button className={commissionButton} disabled={amount === null} onClick={() => setStage(1)}>
                Tiếp tục nhập brief
              </button>
            </CommissionActions>
          </>
        )}
        {stage === 1 && (
          <form onSubmit={openCheckout} className="space-y-5">
            <p className="font-semibold">{design.size.replace("x", " × ")} · {design.format === "gif" ? `GIF · ${design.frames} frame` : "Ảnh tĩnh"} · {amount !== null && formatCommissionMoney(amount)}</p>
            <CommissionBrief note={note} onNote={setNote} references={references} onFiles={addReferences}
              onRemove={(index) => {
                setReferences((current) => current.filter((_, position) => position !== index));
                setError("");
              }} error={error} />
            <CommissionActions>
              <button type="button" onClick={() => setStage(0)}>Quay lại thiết kế</button>
              <button className={commissionButton} disabled={!note.trim()}>Tiếp tục thanh toán</button>
            </CommissionActions>
          </form>
        )}
        {stage === 2 && checkout && (
          <CommissionPayment {...checkout} onBack={() => setStage(1)} onPay={() => setStage(3)} />
        )}
        {stage === 3 && checkout && (
          <CommissionChatBox code={checkout.code} messages={messages}
            onSend={(message) => setMessages((current) => [...current, message])} />
        )}
      </section>
    </div>
  );
}
