import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, MessageCircle, Palette, Sparkles } from "lucide-react";
import InfoPage, { InfoSection } from "@/components/layout/InfoPage";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: `Về chúng tôi | ${SITE.name}`, description: SITE.description };

const OFFERINGS = [
  { Icon: Cpu, title: "Bảng LED ma trận", text: "Thiết bị LED gắn kính xe với nhiều khổ ma trận, hiển thị nhân vật và hiệu ứng động." },
  { Icon: Palette, title: "Thư viện nhân vật", text: "Nhân vật Pixel Art do đội ngũ designer tạo ra, mua một lần và dùng trên thiết bị của bạn." },
  { Icon: Sparkles, title: "Thiết kế theo yêu cầu", text: "Gửi ý tưởng riêng, designer vẽ nhân vật dành riêng cho bạn và khổ LED bạn chọn." },
];

const STEPS = [
  "Gửi yêu cầu thiết kế: chọn gói, khổ LED, mô tả ý tưởng và ảnh tham khảo.",
  "Nhân viên duyệt và báo giá. Bạn thanh toán bằng mã QR chuyển khoản trong vòng 72 giờ.",
  "Phòng chat mở sau khi thanh toán. Designer thiết kế, nhân viên kiểm tra chất lượng trước khi gửi bạn.",
  "Bạn nhận bản xem trước ngay trong mục Tin nhắn, chấp nhận hoặc yêu cầu chỉnh sửa.",
  "Mỗi gói có số lượt chỉnh sửa miễn phí; hết lượt, mỗi lần sửa thêm có phí bằng 10% giá ban đầu.",
];

export default function AboutPage() {
  return (
    <InfoPage title="Về chúng tôi" currentHref="/about" intro={SITE.description}>
      <InfoSection title="Lumintra làm gì?">
        <ul className="!ml-0 grid !list-none gap-4 sm:grid-cols-3">
          {OFFERINGS.map(({ Icon, title, text }) => (
            <li key={title} className="!ml-0 border-2 border-black bg-[#f7faf6] p-4">
              <Icon size={24} aria-hidden="true" />
              <p className="mt-2 font-black">{title}</p>
              <p className="mt-1 text-sm leading-6">{text}</p>
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="Thiết kế nhân vật theo yêu cầu hoạt động thế nào?">
        <ol>{STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>Nếu bạn không phản hồi bản xem trước trong 7 ngày, commission sẽ tự động hoàn tất.</p>
      </InfoSection>

      <InfoSection title="Đội ngũ">
        <p>{SITE.team} là nhóm sinh viên phát triển Lumintra — từ thiết bị LED, ứng dụng điều khiển đến cửa hàng và dịch vụ thiết kế nhân vật.</p>
      </InfoSection>

      <div className="flex flex-wrap gap-3">
        <Link href="/products" className="btn-primary neo-box inline-flex min-h-11 items-center px-5 font-bold">Xem cửa hàng</Link>
        <Link href="/commission/new" className="btn-secondary neo-box inline-flex min-h-11 items-center gap-2 px-5 font-bold"><Sparkles size={16} aria-hidden="true" /> Đặt thiết kế riêng</Link>
        <Link href="/contact" className="btn-secondary neo-box inline-flex min-h-11 items-center gap-2 px-5 font-bold"><MessageCircle size={16} aria-hidden="true" /> Liên hệ</Link>
      </div>
    </InfoPage>
  );
}
