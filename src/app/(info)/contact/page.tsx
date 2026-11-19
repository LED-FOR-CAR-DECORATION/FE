import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import InfoPage, { InfoSection } from "@/components/layout/InfoPage";
import SocialLinks from "@/components/layout/SocialLinks";
import { MAP_EMBED_URL, MAP_LINK_URL, SITE } from "@/config/site";

export const metadata: Metadata = { title: `Liên hệ | ${SITE.name}`, description: `Liên hệ ${SITE.name}: địa chỉ, điện thoại, email và mạng xã hội.` };

const CARDS = [
  { Icon: MapPin, label: "Địa chỉ", value: SITE.contact.address, href: MAP_LINK_URL, external: true },
  { Icon: Phone, label: "Điện thoại", value: SITE.contact.phone, href: SITE.contact.phoneHref },
  { Icon: Mail, label: "Email", value: SITE.contact.email, href: `mailto:${SITE.contact.email}` },
  { Icon: Clock, label: "Giờ làm việc", value: SITE.contact.hours },
];

export default function ContactPage() {
  return (
    <InfoPage title="Liên hệ" currentHref="/contact" intro="Cần tư vấn thiết bị, hỗ trợ đơn hàng hay ý tưởng thiết kế nhân vật? Liên hệ với chúng tôi qua các kênh dưới đây.">
      <ul className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ Icon, label, value, href, external }) => (
          <li key={label} className="border-2 border-black bg-white p-5 shadow-[3px_3px_0_#000]">
            <p className="flex items-center gap-2 text-sm font-black uppercase"><Icon size={18} aria-hidden="true" /> {label}</p>
            {href ? (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-2 block break-words font-semibold text-[#155e59] underline">{value}</a>
            ) : <p className="mt-2 font-semibold">{value}</p>}
          </li>
        ))}
      </ul>

      <InfoSection title="Đã có yêu cầu thiết kế?">
        <p>Sau khi thanh toán commission, bạn trao đổi trực tiếp với nhân viên phụ trách trong mục <Link href="/messages">Tin nhắn</Link> — nhanh hơn email và giữ toàn bộ lịch sử bản xem trước.</p>
        <Link href="/messages" className="btn-primary neo-box !ml-0 inline-flex min-h-11 items-center gap-2 px-5 font-bold !text-black !no-underline"><MessageCircle size={16} aria-hidden="true" /> Mở Tin nhắn</Link>
      </InfoSection>

      <InfoSection title="Mạng xã hội">
        <SocialLinks />
      </InfoSection>

      <section aria-label="Bản đồ" className="overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0_#000]">
        <iframe title={`Bản đồ vị trí ${SITE.name}`} src={MAP_EMBED_URL} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block h-80 w-full border-0" />
      </section>
    </InfoPage>
  );
}
