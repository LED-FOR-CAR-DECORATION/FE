"use client";

import { useState } from "react";
import type { CommissionManagementDetail } from "../services/management-commission.api";

type ReferenceImage = NonNullable<CommissionManagementDetail["attachments"]>[number];

export default function CommissionReferenceImages({ items, onReload }: {
  items: ReferenceImage[];
  onReload: () => void;
}) {
  const images = items.filter((item) => /^https?:\/\//i.test(item.imageUrl));
  if (images.length === 0) return null;

  return (
    <section aria-label="Ảnh tham khảo" className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-black">
        Ảnh tham khảo ({images.length})
      </h3>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.map((item, index) => (
          <li key={`${item.attachmentId}-${item.imageUrl}`}>
            <ReferencePreview item={item} index={index} onReload={onReload} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReferencePreview({ item, index, onReload }: { item: ReferenceImage; index: number; onReload: () => void }) {
  const [failed, setFailed] = useState(false);
  const label = item.caption || `Ảnh tham khảo ${index + 1}`;

  return (
    <figure className="overflow-hidden border-2 border-black bg-[#0d1117] shadow-[2px_2px_0_0_#000]">
      {failed ? (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-white p-4 text-center text-xs">
          <p role="status" className="font-semibold text-black/70">Không tải được ảnh xem trước.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              onReload();
            }}
            className="border-2 border-black bg-white px-3 py-1.5 font-bold text-black hover:bg-neutral-100"
          >
            Tải lại ảnh
          </button>
        </div>
      ) : (
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Mở ${label} trong tab mới`}
          className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {/* Keep signed private URLs and animated GIFs intact. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={label}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="aspect-square w-full bg-[#0d1117] object-contain"
          />
        </a>
      )}
      <figcaption className="flex items-center justify-between gap-2 border-t-2 border-black bg-white px-3 py-2 text-xs">
        <p className="truncate font-bold text-black">{label}</p>
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-black text-primary-ink underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Mở gốc<span className="sr-only">: {label} (tab mới)</span>
        </a>
      </figcaption>
    </figure>
  );
}
