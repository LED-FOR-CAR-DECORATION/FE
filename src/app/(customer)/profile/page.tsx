"use client";

import React, { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AddAddressModal from "@/components/ui/AddAddressModal";
import Link from "next/link";
import {
  User, MapPin, Package, ChevronRight, Edit2, Plus,
  Trash2, Phone, Mail, Calendar, CheckCircle, Truck,
  Circle, Clock, X, ArrowRight, Eye
} from "lucide-react";

/* ── Shared order data (mock) ── */
export const MOCK_ORDERS = [
  {
    id: "ORD-1049", date: "Oct 8, 2024", status: "Pending",
    items: [{ name: "32×32 Matrix Panel", qty: 2, price: 40 }, { name: "Character Sprite Pack A", qty: 1, price: 5 }],
    subtotal: 45, shipping: 5, total: 50,
    address: "Number 8, Sesame Street, NYC, USA",
    service: "ViettelPost Fast",
  },
  {
    id: "ORD-1044", date: "Oct 6, 2024", status: "Shipping",
    items: [{ name: "64×64 Matrix Panel", qty: 1, price: 120 }],
    subtotal: 120, shipping: 5, total: 125,
    address: "654 Vo Van Tan, Q3, TP.HCM",
    service: "ViettelPost Fast",
    tracking: "VTPOST-9284710",
    shippingSteps: [
      { label: "Order placed",    time: "Oct 6, 09:00", done: true },
      { label: "Confirmed",       time: "Oct 6, 11:30", done: true },
      { label: "Picked up",       time: "Oct 7, 08:10", done: true },
      { label: "In transit",      time: "Oct 7, 14:00", done: true },
      { label: "Out for delivery",time: "Oct 8, 08:30", done: false },
      { label: "Delivered",       time: "",             done: false },
    ],
  },
  {
    id: "ORD-1038", date: "Sep 28, 2024", status: "Delivered",
    items: [{ name: "8×8 Matrix Panel", qty: 4, price: 48 }],
    subtotal: 48, shipping: 2, total: 50,
    address: "Number 8, Sesame Street, NYC, USA",
    service: "Standard",
  },
];

type Tab = "account" | "orders";
type OrderStatus = "Pending" | "Confirmed" | "Shipping" | "Delivered" | "Cancelled";

const STATUS_CFG: Record<string, { badge: string; icon: React.ReactNode }> = {
  Pending:   { badge: "bg-amber-100 text-amber-700 border-amber-400",  icon: <Circle size={12} /> },
  Confirmed: { badge: "bg-blue-100  text-blue-700  border-blue-400",   icon: <CheckCircle size={12} /> },
  Shipping:  { badge: "bg-green-100 text-green-700 border-green-400",  icon: <Truck size={12} /> },
  Delivered: { badge: "bg-gray-100  text-gray-600  border-gray-400",   icon: <CheckCircle size={12} /> },
  Cancelled: { badge: "bg-red-100   text-red-700   border-red-400",    icon: <X size={12} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Pending;
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold rounded-sm ${cfg.badge}`}>
      {cfg.icon} {status}
    </span>
  );
}

/* ── Account Info Tab ── */
function AccountInfoTab() {
  const [editMode, setEditMode] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const inputCls = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-6">
      <AddAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
      {/* Personal Info */}
      <div className="neo-box-no-hover bg-white p-6">
        <div className="flex items-center justify-between mb-5 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <User size={18} />
            <h3 className="font-black text-lg uppercase tracking-wide">Personal Information</h3>
          </div>
          <button
            onClick={() => setEditMode(v => !v)}
            className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 px-3"
          >
            <Edit2 size={13} /> {editMode ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "First Name", id: "fn", value: "John",               icon: <User size={14} /> },
            { label: "Last Name",  id: "ln", value: "Doe",                icon: <User size={14} /> },
            { label: "Email",      id: "em", value: "john@example.com",   icon: <Mail size={14} /> },
            { label: "Phone",      id: "ph", value: "(+84) 123 456 789",  icon: <Phone size={14} /> },
            { label: "Date of Birth", id: "dob", value: "Jan 1, 1995",   icon: <Calendar size={14} /> },
          ].map(({ label, id, value, icon }) => (
            <div key={id}>
              <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-bold uppercase mb-1 text-text-muted">
                {icon} {label}
              </label>
              <input
                id={id}
                type="text"
                defaultValue={value}
                disabled={!editMode}
                className={inputCls}
              />
            </div>
          ))}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase mb-1 text-text-muted">
              <Edit2 size={14} /> Password
            </label>
            <input type="password" defaultValue="••••••••" disabled={!editMode} className={inputCls} />
          </div>
        </div>

        {editMode && (
          <div className="flex gap-2 mt-5">
            <button onClick={() => setEditMode(false)} className="btn-secondary text-sm py-2 px-5">Cancel</button>
            <button onClick={() => setEditMode(false)} className="btn-primary text-sm py-2 px-5">Save Changes</button>
          </div>
        )}
      </div>

      {/* Shipping Addresses */}
      <div className="neo-box-no-hover bg-white p-6">
        <div className="flex items-center justify-between mb-5 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <MapPin size={18} />
            <h3 className="font-black text-lg uppercase tracking-wide">Shipping Addresses</h3>
          </div>
          <button onClick={() => setIsAddressModalOpen(true)} className="flex items-center gap-1.5 btn-primary text-xs py-1.5 px-3">
            <Plus size={13} /> Add Address
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { name: "John Doe", phone: "(+84) 123 456 789", address: "Number 8, Sesame Street, NYC, USA", default: true },
            { name: "John Doe", phone: "(+84) 987 654 321", address: "456 Nguyen Hue, Q1, TP.HCM", default: false },
          ].map((addr, i) => (
            <div key={i} className={`border-2 ${addr.default ? "border-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" : "border-black"} p-4 relative`}>
              {addr.default && (
                <span className="absolute top-2 right-2 bg-primary border border-black text-[10px] font-black px-2 py-0.5 uppercase">Default</span>
              )}
              <p className="font-black">{addr.name}</p>
              <p className="text-sm text-text-muted">{addr.phone}</p>
              <p className="text-sm mt-1">{addr.address}</p>
              <div className="flex items-center gap-3 mt-3">
                <button className="text-xs font-bold text-primary-dark hover:underline flex items-center gap-1"><Edit2 size={11} /> Edit</button>
                {!addr.default && (
                  <>
                    <button className="text-xs font-bold text-text-muted hover:underline flex items-center gap-1"><Trash2 size={11} /> Delete</button>
                    <button className="text-xs font-bold hover:underline">Set as default</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Order History Tab ── */
function OrderHistoryTab() {
  return (
    <div className="neo-box-no-hover bg-white">
      <div className="flex items-center gap-2 p-5 border-b-2 border-black">
        <Package size={18} />
        <h3 className="font-black text-lg uppercase tracking-wide">Order History</h3>
      </div>

      <div className="divide-y-2 divide-black">
        {MOCK_ORDERS.map((order) => (
          <div key={order.id} className="p-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="font-black text-primary-dark">#{order.id}</p>
                <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> {order.date} · {order.service}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="flex flex-col gap-1 mb-3">
              {order.items.map((item, i) => (
                <p key={i} className="text-sm font-medium">
                  {item.name} <span className="text-text-muted">× {item.qty}</span> — <span className="font-bold">${item.price}</span>
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Total: <span className="text-primary-dark">${order.total}</span></p>
              <Link
                href={`/profile/orders/${order.id}`}
                className="flex items-center gap-1.5 text-xs font-bold border-2 border-black px-3 py-1.5 hover:bg-primary/20 transition-colors"
              >
                <Eye size={13} /> View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Profile Page ── */
export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("account");

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-primary border-2 border-black flex items-center justify-center font-black text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              J
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">John Doe</h1>
              <p className="text-text-muted text-sm">john@example.com</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b-2 border-black mb-6">
            {(["account", "orders"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-black uppercase tracking-wide border-r-2 border-black transition-colors
                  ${tab === t ? "bg-primary" : "bg-white hover:bg-gray-50"}`}
              >
                {t === "account" ? "Account Info" : "Order History"}
              </button>
            ))}
          </div>

          {tab === "account" ? <AccountInfoTab /> : <OrderHistoryTab />}
        </div>
      </main>
      <Footer />
    </>
  );
}
