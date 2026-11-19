import { FaFacebook, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { SiGooglemaps } from "react-icons/si";
import { MAP_LINK_URL, SITE } from "@/config/site";

const LINKS = [
  { href: SITE.social.facebook, label: "Facebook", Icon: FaFacebook },
  { href: SITE.social.instagram, label: "Instagram", Icon: FaInstagram },
  { href: SITE.social.x, label: "X (Twitter)", Icon: FaXTwitter },
  { href: MAP_LINK_URL, label: "Google Maps", Icon: SiGooglemaps },
];

/** Nút mạng xã hội kiểu neo (viền đen, đổ bóng cứng) dùng ở Footer và trang Liên hệ. */
export default function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`} aria-label="Mạng xã hội">
      {LINKS.map(({ href, label, Icon }) => (
        <li key={label}>
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${SITE.name} trên ${label} (mở tab mới)`} title={label}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:bg-black hover:text-white hover:shadow-[3px_3px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <Icon size={20} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
