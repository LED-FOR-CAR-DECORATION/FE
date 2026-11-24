"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Loader2, MessageCircle, RefreshCw, Search } from "lucide-react";
import "@/styles/transitions.css";
import { getApiErrorMessage } from "@/lib/api/auth";
import { commissionStatusLabel } from "../commission-status";
import { canReadHistory, listCommissionMessages, type CommissionMessage } from "../services/commission-messages.api";
import CommissionAvatar from "./CommissionAvatar";
import CommissionChatRoom from "./CommissionChatRoom";
import type { ChatViewer } from "../hooks/useCommissionRoom";

/**
 * Hộp thư bố cục kiểu Messenger, dùng chung cho staff và khách: mỗi commission đã mở chat là một hội thoại.
 * Danh sách bên trái, phòng chat ở giữa (realtime qua STOMP), thông tin commission bên phải.
 * Đoạn tin cuối của các hội thoại khác được làm mới định kỳ.
 */

export interface InboxItem {
  commissionId: number;
  title: string;
  status: string;
  /** Dòng phụ dưới tên commission, ví dụ "Khách: An · 32x64". */
  subtitle?: string;
}

interface Conversation {
  item: InboxItem;
  last?: CommissionMessage;
}

export interface InboxFilter { key: string; label: string; statuses?: string[] }

const PREVIEW_CONCURRENCY = 6;
const PREVIEW_REFRESH_MS = 30_000;

/** Bộ lọc mặc định của staff — theo giai đoạn của commission. */
export const STAFF_FILTERS: InboxFilter[] = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "review", label: "Chờ duyệt bản nháp", statuses: ["INTERNAL_REVIEW"] },
  { key: "design", label: "Đang thiết kế", statuses: ["PAID", "IN_PROGRESS", "INTERNAL_REVISION_REQUIRED", "AWAITING_ESTIMATE"] },
  { key: "customer", label: "Chờ khách", statuses: ["PREVIEW_DELIVERED", "AWAITING_EXTRA_PAYMENT"] },
  { key: "done", label: "Hoàn thành", statuses: ["COMPLETED"] },
];

function readSeen(prefix: string, commissionId: number) {
  try { return Number(window.localStorage.getItem(`${prefix}${commissionId}`)) || 0; } catch { return 0; }
}
function writeSeen(prefix: string, commissionId: number, messageId: number) {
  try { window.localStorage.setItem(`${prefix}${commissionId}`, String(messageId)); } catch { /* bỏ qua */ }
}

/** Tin do chính người đang xem gửi. */
function isOwn(message: CommissionMessage, viewer: ChatViewer) {
  return viewer === "CUSTOMER" ? message.senderRole === "CUSTOMER" : message.senderRole !== "CUSTOMER" && message.senderRole !== "SYSTEM";
}

function previewText(viewer: ChatViewer, message?: CommissionMessage) {
  if (!message) return "Chưa có tin nhắn";
  const own = isOwn(message, viewer);
  const other = message.senderRole === "SYSTEM" ? "" : viewer === "CUSTOMER" ? "LUMINTRA: " : "Khách: ";
  const prefix = own ? "Bạn: " : other;
  switch (message.messageType) {
    case "IMAGE": return `${prefix}Đã gửi một ảnh${message.content ? ` · ${message.content}` : ""}`;
    case "DELIVERABLE_CARD": return viewer === "CUSTOMER" ? "Có bản xem trước mới cho bạn" : "Bản xem trước đã được gửi cho khách";
    case "EXTRA_FEE_CARD": return "Thẻ yêu cầu chỉnh sửa";
    default: return `${prefix}${message.content ?? ""}`;
  }
}

function shortTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }));
  return results;
}

async function loadLastMessage(commissionId: number) {
  try {
    const { data } = await listCommissionMessages(commissionId);
    return data?.length ? data[data.length - 1] : undefined;
  } catch {
    return undefined;
  }
}

export default function CommissionInbox({ viewer, loadItems, filters, className = "", emptyText }: {
  viewer: ChatViewer;
  /** Tải danh sách commission (component tự lọc theo canReadHistory). Truyền hàm ổn định (khai báo ngoài component). */
  loadItems: () => Promise<InboxItem[]>;
  filters: InboxFilter[];
  className?: string;
  emptyText: string;
}) {
  const seenPrefix = viewer === "CUSTOMER" ? "customer_chat_seen_" : "staff_chat_seen_";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get("commissionId")) || undefined;

  const [conversations, setConversations] = useState<Conversation[]>();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [seen, setSeen] = useState<Record<number, number>>({});
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const itemsRef = useRef<InboxItem[]>([]);

  const select = useCallback((commissionId?: number) => {
    router.replace(commissionId ? `${pathname}?commissionId=${commissionId}` : pathname, { scroll: false });
  }, [pathname, router]);

  // Danh sách commission đã mở chat (từ hàng đợi staff) + tin cuối của từng hội thoại.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const chatItems = (await loadItems()).filter((item) => canReadHistory(item.status));
        itemsRef.current = chatItems;
        const lasts = await mapLimited(chatItems, PREVIEW_CONCURRENCY, (item) => loadLastMessage(item.commissionId));
        if (!active) return;
        setConversations(chatItems.map((item, index) => ({ item, last: lasts[index] })));
        setSeen(Object.fromEntries(chatItems.map((item) => [item.commissionId, readSeen(seenPrefix, item.commissionId)])));
        setError("");
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, "Không tải được danh sách hội thoại."));
      } finally {
        if (active) setRefreshing(false);
      }
    })();
    return () => { active = false; };
  }, [loadItems, revision, seenPrefix]);

  // Làm mới đoạn tin cuối định kỳ khi tab đang hiển thị.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible" || itemsRef.current.length === 0) return;
      const items = itemsRef.current;
      const lasts = await mapLimited(items, PREVIEW_CONCURRENCY, (item) => loadLastMessage(item.commissionId));
      setConversations((current) => current?.map((conversation) => {
        const index = items.findIndex((item) => item.commissionId === conversation.item.commissionId);
        return index >= 0 && lasts[index] ? { ...conversation, last: lasts[index] } : conversation;
      }));
    }, PREVIEW_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // Hội thoại đang mở coi như đã đọc tới tin cuối.
  const selectedLastId = conversations?.find((entry) => entry.item.commissionId === selectedId)?.last?.messageId;
  useEffect(() => {
    if (!selectedId || !selectedLastId) return;
    writeSeen(seenPrefix, selectedId, selectedLastId);
    setSeen((current) => (current[selectedId] === selectedLastId ? current : { ...current, [selectedId]: selectedLastId }));
  }, [seenPrefix, selectedId, selectedLastId]);

  const isUnread = useCallback((entry: Conversation) => Boolean(
    entry.last && !isOwn(entry.last, viewer) && entry.last.messageId > (seen[entry.item.commissionId] ?? 0),
  ), [seen, viewer]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (conversations ?? [])
      .filter((entry) => {
        if (filter === "all") return true;
        if (filter === "unread") return isUnread(entry);
        return filters.find((option) => option.key === filter)?.statuses?.includes(entry.item.status) ?? true;
      })
      .filter((entry) => !needle || [entry.item.title, entry.item.subtitle ?? "", `#${entry.item.commissionId}`]
        .some((value) => value.toLowerCase().includes(needle)))
      .sort((a, b) => new Date(b.last?.createdAt ?? 0).getTime() - new Date(a.last?.createdAt ?? 0).getTime());
  }, [conversations, filter, filters, isUnread, query]);

  const unreadCount = (conversations ?? []).filter(isUnread).length;

  return (
    <div className={`flex min-h-[520px] overflow-hidden rounded-2xl border border-[#d8e6dc] bg-white shadow-xs ${className}`}>
      {/* Danh sách hội thoại */}
      <section aria-label="Danh sách hội thoại"
        className={`${selectedId ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-r border-[#e3ece4] md:w-[340px] md:shrink-0`}>
        <div className="space-y-3 border-b border-[#e3ece4] p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-xl font-black text-[#1f432b]">
              Tin nhắn
              {unreadCount > 0 && <span className="rounded-full bg-red-600 px-2 text-xs font-bold text-white" aria-label={`${unreadCount} hội thoại chưa đọc`}>{unreadCount}</span>}
            </h1>
            <button type="button" aria-label="Làm mới danh sách" disabled={refreshing}
              onClick={() => { setRefreshing(true); setRevision((value) => value + 1); }}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#1f432b] hover:bg-[#f0f6f1] disabled:opacity-50">
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
          <label className="relative block">
            <span className="sr-only">Tìm hội thoại</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={viewer === "CUSTOMER" ? "Tìm theo tên commission hoặc #mã" : "Tìm theo tên commission, #mã hoặc khách"}
              className="min-h-11 w-full rounded-full border border-[#d8e6dc] bg-[#f7fbf8] pl-9 pr-3 text-sm outline-none focus:border-[#439660] focus:bg-white" />
          </label>
          <div role="tablist" aria-label="Lọc hội thoại" className="flex gap-1.5 overflow-x-auto">
            {filters.map((entry) => (
              <button key={entry.key} type="button" role="tab" aria-selected={filter === entry.key} onClick={() => setFilter(entry.key)}
                className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${filter === entry.key ? "bg-[#1f432b] text-white" : "bg-[#eef5f0] text-[#1f432b] hover:bg-[#e2efe5]"}`}>
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error && <p role="alert" className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!conversations && !error ? (
            <ul className="t-skel-skeleton is-pulsing space-y-1 p-2" style={{ "--pulse-count": "infinite" } as CSSProperties} aria-busy="true">
              <li className="sr-only" role="status">Đang tải hội thoại…</li>
              {Array.from({ length: 6 }, (_, index) => (
                <li key={index} className="flex items-center gap-3 rounded-xl p-3" aria-hidden="true">
                  <span className="h-12 w-12 shrink-0 rounded-full bg-[#e4ece6]" />
                  <span className="flex-1 space-y-2"><span className="block h-3 w-2/3 rounded bg-[#e4ece6]" /><span className="block h-3 w-1/2 rounded bg-[#e4ece6]" /></span>
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <MessageCircle size={32} className="mx-auto mb-2 text-[#88b998]" />
              {conversations?.length ? "Không có hội thoại khớp bộ lọc." : emptyText}
            </div>
          ) : (
            <ul className="p-2">
              {visible.map((entry) => {
                const { item, last } = entry;
                const unread = isUnread(entry);
                const active = item.commissionId === selectedId;
                return (
                  <li key={item.commissionId}>
                    <button type="button" onClick={() => select(item.commissionId)} aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f] ${active ? "bg-[#e9f5ed]" : "hover:bg-[#f4f8f5]"}`}>
                      <CommissionAvatar commissionId={item.commissionId} badge={item.status === "INTERNAL_REVIEW"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${unread ? "font-black text-[#14281c]" : "font-bold text-[#1f432b]"}`}>{item.title}</span>
                          <span className={`shrink-0 text-[11px] ${unread ? "font-bold text-[#155e59]" : "text-slate-400"}`}>{shortTime(last?.createdAt)}</span>
                        </span>
                        {item.subtitle && <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>}
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-xs ${unread ? "font-bold text-[#14281c]" : "text-slate-500"}`}>{previewText(viewer, last)}</span>
                          {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2d6a4f]" aria-label="Chưa đọc" />}
                        </span>
                        <span className="mt-1 inline-flex rounded-full bg-[#f0f6f1] px-2 text-[10px] font-bold text-[#1f432b]">{commissionStatusLabel(item.status)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Phòng chat */}
      <section aria-label="Cuộc trò chuyện" className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {selectedId ? (
          <CommissionChatRoom key={selectedId} commissionId={selectedId} viewer={viewer} variant="messenger" onBack={() => select(undefined)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
            {conversations ? <MessageCircle size={44} className="text-[#88b998]" /> : <Loader2 size={28} className="animate-spin text-[#2d6a4f]" />}
            <p className="font-bold text-[#1f432b]">Chọn một cuộc trò chuyện</p>
            <p className="max-w-xs text-sm">{viewer === "CUSTOMER"
              ? "Trao đổi với nhân viên LUMINTRA, xem bản xem trước và xác nhận chỉnh sửa cho từng commission."
              : "Tin nhắn với khách, bản nháp chờ duyệt và thẻ chỉnh sửa của từng commission nằm ở đây."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
