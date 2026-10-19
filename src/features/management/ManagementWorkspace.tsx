"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search, Plus, Pencil, Download, X, PackageCheck } from "lucide-react";
import { managementScreens, type RecordData } from "./screens";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ManagementWorkspace({ screenKey }: { screenKey: string }) {
  const screen = managementScreens[screenKey];
  const { user } = useAuth();
  const [rows, setRows] = useState<RecordData[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<RecordData | null>(null);
  const [message, setMessage] = useState("");
  const storageKey = `mirage.workspace.${user?.userId ?? "guest"}.${screenKey}`;
  useEffect(() => {
    setReady(false);
    try { const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null"); setRows(Array.isArray(saved) && saved.every(row => row && typeof row === "object" && screen.fields.every(field => typeof row[field.key] === "string") && typeof row.id === "string") ? saved : screen.rows); }
    catch { setRows(screen.rows); }
    setReady(true);
  }, [storageKey, screen]);
  const statuses = screen.fields.find(f => f.key === "status")?.options;
  const filtered = rows.filter(row => Object.values(row).join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (!filter || row.status === filter));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const entry = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
    if (screen.fields.some(field => !entry[field.key] || (field.type === "number" && (!Number.isFinite(Number(entry[field.key])) || Number(entry[field.key]) < 0)))) { setMessage("Vui lòng nhập đầy đủ thông tin hợp lệ."); return; }
    if (rows.some(row => row.id !== entry.id && row.name.toLowerCase() === entry.name.toLowerCase())) { setMessage("Tên hoặc email đã tồn tại."); return; }
    const next = entry.id ? rows.map(row => row.id === entry.id ? entry : row) : [...rows, { ...entry, id: crypto.randomUUID() }];
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setRows(next); setDraft(null); setMessage("Đã lưu trên trình duyệt này."); }
    catch { setMessage("Không thể lưu. Vui lòng kiểm tra bộ nhớ trình duyệt."); }
  }
  function exportCsv() {
    const columns = ["id", ...screen.fields.map(f => f.key)];
    const escape = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
    const csv = "\uFEFF" + [columns, ...filtered.map(row => columns.map(key => row[key] ?? ""))].map(row => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${screenKey}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-primary-dark">Mirage / Vận hành</p><h1 className="mt-1 text-2xl font-black">{screen.title}</h1><p className="mt-1 text-sm text-text-muted">{screen.description}</p></div><button disabled={!ready} onClick={() => { setDraft(Object.fromEntries(screen.fields.map(f => [f.key, f.options?.[0] ?? ""]))); setMessage(""); }} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} />Thêm {screen.singular}</button></div>
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Dữ liệu mô phỏng · Thay đổi chỉ lưu trên trình duyệt, chưa đồng bộ máy chủ.</p>
    <div className="grid gap-4 sm:grid-cols-3">{[["Tổng bản ghi", rows.length], ["Đang hiển thị", filtered.length], [screenKey === "inventory" ? "Sắp hết hàng" : "Tạm ngưng / Đã khóa", rows.filter(row => screenKey === "inventory" ? Number(row.quantity) <= Number(row.threshold) : ["Tạm ngưng", "Đã khóa"].includes(row.status)).length]].map(([label, value]) => <section key={label} className="rounded-lg border border-green-100 bg-white p-5"><PackageCheck className="mb-3 text-primary-dark" size={20} /><p className="text-sm text-text-muted">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></section>)}</div>
    {message && <p role="status" className="rounded border border-primary bg-green-50 px-4 py-3 text-sm">{message}</p>}
    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4"><label className="flex min-w-48 flex-1 items-center gap-2"><Search size={17} /><input aria-label={`Tìm ${screen.singular}`} placeholder={`Tìm ${screen.singular}...`} value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent p-1 outline-none" /></label>{statuses && <select aria-label="Lọc trạng thái" value={filter} onChange={e => setFilter(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>}<button onClick={exportCsv} disabled={!ready} className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-bold"><Download size={15} />Xuất CSV</button></div>
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-green-50"><tr>{screen.fields.map(f => <th key={f.key} className="whitespace-nowrap px-4 py-3 text-xs uppercase">{f.label}</th>)}<th className="px-4 py-3">Thao tác</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} className="border-t border-gray-100">{screen.fields.map(f => <td key={f.key} className="max-w-64 px-4 py-4"><span className={f.key === "status" ? "inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800" : ""}>{f.type === "number" && f.key === "price" ? `$${Number(row[f.key]).toFixed(2)}` : row[f.key]}</span></td>)}<td className="px-4 py-3"><button aria-label={`Chỉnh sửa ${row.name}`} onClick={() => { setDraft({ ...row }); setMessage(""); }} className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-2 text-xs font-bold"><Pencil size={13} />Sửa</button></td></tr>)}</tbody></table>{(!ready || filtered.length === 0) && <p className="p-12 text-center text-sm text-text-muted">{ready ? "Không có kết quả phù hợp. Hãy thay đổi bộ lọc hoặc thêm bản ghi." : "Đang tải dữ liệu..."}</p>}</div>
    {draft && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onKeyDown={e => { if (e.key === "Escape") setDraft(null); }}><section role="dialog" aria-modal="true" aria-labelledby="editor-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border-2 border-black bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 id="editor-title" className="text-xl font-black">{draft.id ? "Chỉnh sửa" : "Thêm"} {screen.singular}</h2><button autoFocus aria-label="Đóng" onClick={() => setDraft(null)}><X size={22} /></button></div><form onSubmit={save} className="space-y-4">{screen.fields.map(field => <label key={field.key} className="block text-sm font-bold">{field.label}{field.options ? <select required value={draft[field.key]} onChange={e => setDraft({ ...draft, [field.key]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2">{field.options.map(value => <option key={value}>{value}</option>)}</select> : field.type === "textarea" ? <textarea required value={draft[field.key]} onChange={e => setDraft({ ...draft, [field.key]: e.target.value })} className="mt-1 min-h-24 w-full rounded border border-gray-300 px-3 py-2" /> : <input required type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} step={field.key === "price" ? "0.01" : "1"} value={draft[field.key]} onChange={e => setDraft({ ...draft, [field.key]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />}</label>)}{message && <p role="alert" className="text-sm text-red-700">{message}</p>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setDraft(null)} className="btn-secondary">Hủy</button><button className="btn-primary">Lưu thay đổi</button></div></form></section></div>}
  </div>;
}
