"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadConversations } from "@/features/commission-chat/services/commission-chat.service";
import type { Conversation } from "@/features/commission-chat/types";
import { formatCommissionMoney } from "../config/fixedPricing";

export default function CommissionRequestList() {
  const [requests, setRequests] = useState<Conversation[] | null>(null);

  useEffect(() => {
    function refresh() {
      setRequests(loadConversations().filter(({ id }) => /^CM[0-9A-F]{8}$/.test(id)));
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("mirage-commission-chat-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("mirage-commission-chat-updated", refresh);
    };
  }, []);

  return (
    <section aria-labelledby="commission-list-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="commission-list-heading" className="text-3xl font-black text-[#155e59]">Yêu cầu Commission</h1>
        <Link href="/commission/new" className="rounded-lg bg-[#155e59] px-4 py-3 font-semibold text-white hover:bg-[#0e4b47]">
          Tạo yêu cầu mới
        </Link>
      </div>
      {requests === null ? (
        <p role="status">Đang tải yêu cầu…</p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-[#cfe3d0] bg-white p-5">Bạn chưa có yêu cầu Commission nào.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map(({ id, commission }) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#cfe3d0] bg-white p-5">
              <div className="min-w-0 space-y-1">
                <h2 className="font-bold text-[#155e59]">{commission.characterName}</h2>
                <p className="line-clamp-2 break-words text-sm">{commission.description}</p>
                <p className="text-sm">{formatCommissionMoney(commission.price)} · {commission.isPaid ? "Đã thanh toán (demo)" : "Chờ thanh toán"}</p>
              </div>
              <Link href={`/chat#${encodeURIComponent(id)}`} className="font-semibold text-[#155e59] underline">
                Mở chat <span className="sr-only">cho {id}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
