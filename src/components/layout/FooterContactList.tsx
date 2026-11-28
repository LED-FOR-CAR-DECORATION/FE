"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { SiGooglemaps } from "react-icons/si";
import { GMAIL_COMPOSE_URL, MAP_EMBED_URL, MAP_LINK_URL, SITE } from "@/config/site";

const linkClass =
  "inline-flex min-h-8 items-center hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black";

/**
 * Interactive Footer contact block:
 * - Address: hover/focus opens a lazy-loaded Google Map preview popover; click opens Google Maps.
 * - Email: hover/focus opens quick Gmail / Copy / mailto actions; click opens Gmail compose.
 */
export default function FooterContactList() {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const mapTimerRef = useRef<number | undefined>(undefined);
  const emailTimerRef = useRef<number | undefined>(undefined);
  const copyTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (mapTimerRef.current !== undefined) window.clearTimeout(mapTimerRef.current);
      if (emailTimerRef.current !== undefined) window.clearTimeout(emailTimerRef.current);
      if (copyTimerRef.current !== undefined) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mapOpen && !emailOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMapOpen(false);
        setEmailOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mapOpen, emailOpen]);

  const openMap = () => {
    if (mapTimerRef.current !== undefined) window.clearTimeout(mapTimerRef.current);
    setEmailOpen(false);
    setMapMounted(true);
    setMapOpen(true);
  };

  const scheduleCloseMap = () => {
    if (mapTimerRef.current !== undefined) window.clearTimeout(mapTimerRef.current);
    mapTimerRef.current = window.setTimeout(() => setMapOpen(false), 140);
  };

  const openEmail = () => {
    if (emailTimerRef.current !== undefined) window.clearTimeout(emailTimerRef.current);
    setMapOpen(false);
    setEmailOpen(true);
  };

  const scheduleCloseEmail = () => {
    if (emailTimerRef.current !== undefined) window.clearTimeout(emailTimerRef.current);
    emailTimerRef.current = window.setTimeout(() => setEmailOpen(false), 140);
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.contact.email);
      setCopiedEmail(true);
      if (copyTimerRef.current !== undefined) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Clipboard API unavailable in restricted contexts; fall back gracefully
    }
  };

  return (
    <address className="mt-5 space-y-2 text-sm font-medium not-italic">
      {/* Address with hover Map Popover + click redirect to Google Maps */}
      <div
        className="relative"
        onMouseEnter={openMap}
        onMouseLeave={scheduleCloseMap}
        onFocusCapture={openMap}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            scheduleCloseMap();
          }
        }}
      >
        <a
          href={MAP_LINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Xem địa chỉ ${SITE.name} trên Google Maps (mở tab mới)`}
          className="group flex items-start gap-2 rounded-xs transition-colors hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{SITE.contact.address}</span>
        </a>

        {mapOpen && (
          <div
            role="dialog"
            aria-label={`Bản đồ vị trí ${SITE.name}`}
            className="absolute bottom-full left-0 z-50 w-80 max-w-[calc(100vw-2rem)] pb-2.5 sm:w-96 lg:left-auto lg:right-0"
          >
            <div className="relative border-2 border-black bg-white shadow-[4px_4px_0_#000]">
              <div className="flex items-center justify-between gap-2 border-b-2 border-black bg-gray-50 px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                  <SiGooglemaps aria-hidden="true" /> Tìm đường tới {SITE.name}
                </p>
                <a
                  href={MAP_LINK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary-ink hover:underline"
                >
                  Mở Google Maps <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
              {mapMounted && (
                <iframe
                  title={`Bản đồ vị trí ${SITE.name}`}
                  src={MAP_EMBED_URL}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-44 w-full border-0 bg-gray-100"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute -bottom-[7px] left-5 h-3 w-3 rotate-45 border-b-2 border-r-2 border-black bg-white lg:left-auto lg:right-10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Phone */}
      <p className="flex gap-2">
        <Phone size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <a href={SITE.contact.phoneHref} className={linkClass}>
          {SITE.contact.phone}
        </a>
      </p>

      {/* Email with hover Gmail/Copy Popover + click redirect to Gmail compose */}
      <div
        className="relative w-fit max-w-full"
        onMouseEnter={openEmail}
        onMouseLeave={scheduleCloseEmail}
        onFocusCapture={openEmail}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            scheduleCloseEmail();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <Mail size={16} className="shrink-0" aria-hidden="true" />
          <a
            href={GMAIL_COMPOSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Gửi email tới ${SITE.contact.email} qua Gmail (mở tab mới)`}
            className={linkClass}
          >
            {SITE.contact.email}
          </a>
        </div>

        {emailOpen && (
          <div
            role="dialog"
            aria-label="Tùy chọn liên hệ email"
            className="absolute bottom-full left-0 z-50 w-72 max-w-[calc(100vw-2rem)] pb-2.5"
          >
            <div className="relative border-2 border-black bg-white p-3 shadow-[4px_4px_0_#000]">
              <p className="truncate border-b-2 border-dashed border-gray-200 pb-2 text-xs font-black text-black">
                {SITE.contact.email}
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <a
                  href={GMAIL_COMPOSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
                >
                  <Mail size={13} aria-hidden="true" />
                  Mở Gmail soạn thư
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
                >
                  {copiedEmail ? (
                    <>
                      <Check size={13} className="text-primary-ink" aria-hidden="true" />
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy size={13} aria-hidden="true" />
                      Sao chép email
                    </>
                  )}
                </button>
                <a
                  href={`mailto:${SITE.contact.email}`}
                  className="mt-0.5 text-center text-[11px] font-bold text-text-muted hover:text-black hover:underline"
                >
                  Hoặc mở ứng dụng Mail mặc định
                </a>
              </div>
              <span
                aria-hidden="true"
                className="absolute -bottom-[7px] left-5 h-3 w-3 rotate-45 border-b-2 border-r-2 border-black bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Business hours */}
      <p className="flex gap-2">
        <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{SITE.contact.hours}</span>
      </p>
    </address>
  );
}
