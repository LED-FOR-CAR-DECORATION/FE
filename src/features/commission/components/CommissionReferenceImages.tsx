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
      <h3 className="font-bold text-[#155e59]">Ảnh tham khảo ({images.length})</h3>
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
    <figure className="overflow-hidden rounded-lg border border-[#cfe3d0] bg-[#f4f8f3]">
      {failed ? (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 p-4 text-center text-sm">
          <p role="status">Không tải được ảnh xem trước.</p>
          <button type="button" onClick={() => { setFailed(false); onReload(); }}
            className="min-h-11 px-3 font-semibold text-[#155e59] underline focus-visible:outline-2 focus-visible:outline-offset-2">
            Tải lại ảnh
          </button>
        </div>
      ) : (
        <a href={item.imageUrl} target="_blank" rel="noreferrer" aria-label={`Mở ${label} trong tab mới`}
          className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155e59]">
          {/* Keep signed private URLs and animated GIFs intact. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={label} loading="lazy" decoding="async" onError={() => setFailed(true)}
            className="aspect-square w-full bg-white object-contain" />
        </a>
      )}
      <figcaption className="space-y-1 border-t border-[#cfe3d0] px-3 py-2 text-sm">
        <p className="break-words font-medium">{label}</p>
        <a href={item.imageUrl} target="_blank" rel="noreferrer"
          className="inline-flex min-h-11 items-center font-semibold text-[#155e59] underline focus-visible:outline-2 focus-visible:outline-offset-2">
          Mở ảnh gốc<span className="sr-only">: {label} (tab mới)</span>
        </a>
      </figcaption>
    </figure>
  );
}
