import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import InfoPage, { InfoSection } from "@/components/layout/InfoPage";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: `Hỗ trợ kỹ thuật | ${SITE.name}`, description: "Câu hỏi thường gặp về thiết bị LED, nhân vật, commission, thanh toán và bảo hành." };

const FAQ: { q: string; a: ReactNode }[] = [
  { q: "Tôi đã chuyển khoản nhưng đơn/commission chưa được xác nhận?", a: <>Hệ thống tự xác nhận khi nhận được giao dịch khớp với mã QR. Hãy giữ nguyên trang thanh toán vài phút; nếu mã đã hết hạn hoặc vẫn chưa được xác nhận, <Link href="/contact">liên hệ chúng tôi</Link> kèm ảnh biên lai.</> },
  { q: "Nhân vật tôi mua nằm ở đâu?", a: <>Trong <Link href="/profile/gallery">Thư viện nhân vật</Link> ở trang hồ sơ. Từ đó bạn có thể đồng bộ nhân vật lên thiết bị LED của mình.</> },
  { q: "Làm sao theo dõi đơn hàng thiết bị?", a: <>Vào <Link href="/profile/orders">Đơn mua</Link> để xem trạng thái xử lý và giao hàng. Đơn được giao qua đối tác Ahamove sau khi nhân viên xác nhận.</> },
  { q: "Tôi muốn sửa bản thiết kế commission?", a: <>Mở <Link href="/messages">Tin nhắn</Link>, mô tả điều muốn sửa cho nhân viên. Nhân viên sẽ gửi thẻ yêu cầu chỉnh sửa để bạn xác nhận — miễn phí nếu còn lượt, hoặc kèm phí 10% giá ban đầu nếu đã hết lượt.</> },
  { q: "Thiết bị LED gặp lỗi phần cứng?", a: <>Gửi yêu cầu tại <Link href="/profile/warranty">Bảo hành thiết bị</Link>, mô tả lỗi và đính kèm tối đa 5 ảnh. Nhân viên sẽ xử lý và cập nhật kết quả cho bạn.</> },
  { q: "Tôi quên mật khẩu?", a: <>Tại trang <Link href="/login">Đăng nhập</Link>, chọn “Quên mật khẩu” và làm theo hướng dẫn được gửi tới email.</> },
];

export default function SupportPage() {
  return (
    <InfoPage title="Hỗ trợ kỹ thuật" currentHref="/support" intro="Giải đáp nhanh các vấn đề thường gặp. Không tìm thấy câu trả lời? Liên hệ đội ngũ hỗ trợ.">
      <InfoSection title="Câu hỏi thường gặp">
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group border-2 border-black bg-[#f7faf6] open:bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-bold">
                {q}
                <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <div className="border-t-2 border-black px-4 py-3">{a}</div>
            </details>
          ))}
        </div>
      </InfoSection>
      <InfoSection title="Vẫn cần hỗ trợ?">
        <p>Gọi <a href={SITE.contact.phoneHref}>{SITE.contact.phone}</a> ({SITE.contact.hours}) hoặc email <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>. Xem thêm tại trang <Link href="/contact">Liên hệ</Link>.</p>
      </InfoSection>
    </InfoPage>
  );
}
