"use client";

import Link from "next/link";
import { ArrowLeft, Download, Image as ImageIcon, LockKeyhole } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useGallery } from "@/features/character/context/GalleryContext";
import { getCharacterById } from "@/features/character/catalog";

export default function GalleryPage() {
  const { entitlements } = useGallery();
  const characters = entitlements.map((entitlement) => ({
    entitlement,
    character: getCharacterById(entitlement.characterId),
  })).filter((item) => item.character);

  return <><Header /><main className="profile-page flex-1 bg-background py-7 md:py-10"><div className="container relative z-10 mx-auto max-w-5xl px-4">
    <Link href="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary-dark hover:underline"><ArrowLeft size={15} /> Hồ sơ của tôi</Link>
    <div className="mb-6 flex items-center gap-3"><span className="profile-section-icon"><ImageIcon size={19} /></span><div><h1 className="text-3xl font-black tracking-tight">Gallery</h1><p className="text-sm text-text-muted">Các Character bạn đã sở hữu.</p></div></div>
    {characters.length === 0 ? <section className="profile-card p-12 text-center"><LockKeyhole className="mx-auto mb-3 text-primary-dark" size={38} /><h2 className="text-xl font-black">Gallery đang trống</h2><p className="mt-2 text-sm text-text-muted">Character bạn mua sẽ xuất hiện ở đây sau khi thanh toán thành công.</p><Link href="/products?category=CHARACTER" className="btn-primary mt-5 inline-block">Khám phá Character</Link></section> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{characters.map(({ character, entitlement }) => <article key={entitlement.entitlementId} className="profile-card overflow-hidden p-0"><div className="grid aspect-square place-items-center border-b-2 border-black bg-primary/10 text-sm font-bold text-text-muted">{character?.previewUrl ? <img src={character.previewUrl} alt={character.name} className="h-full w-full object-cover" /> : "[Preview Character]"}</div><div className="p-4"><h2 className="font-black">{character?.name}</h2><p className="mt-1 text-sm text-text-muted">{character?.description}</p><p className="mt-3 text-xs font-semibold text-primary-dark">Đã sở hữu · {new Date(entitlement.grantedAt).toLocaleDateString("vi-VN")}</p><button type="button" className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-sm"><Download size={15} /> Sử dụng Character</button></div></article>)}</div>}
  </div></main><Footer /></>;
}
