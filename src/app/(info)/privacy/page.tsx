import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/layout/InfoPage";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: `Chính sách bảo mật | ${SITE.name}` };

export default function PrivacyPage() {
  return (
    <InfoPage title="Chính sách bảo mật" currentHref="/privacy" updatedAt="19/11/2026"
      intro="Chúng tôi chỉ thu thập thông tin cần thiết để cung cấp dịch vụ và không bán dữ liệu của bạn.">
      <InfoSection title="Thông tin chúng tôi thu thập">
        <ul>
          <li>Thông tin tài khoản: họ tên, email, số điện thoại.</li>
          <li>Địa chỉ giao hàng bạn lưu và thông tin đơn hàng, thanh toán.</li>
          <li>Nội dung commission: mô tả, ảnh tham khảo và tin nhắn trao đổi với nhân viên.</li>
          <li>Thông tin thiết bị LED đã liên kết với tài khoản và các yêu cầu bảo hành.</li>
        </ul>
      </InfoSection>
      <InfoSection title="Mục đích sử dụng">
        <ul>
          <li>Xử lý đơn hàng, giao hàng, thanh toán, commission và bảo hành.</li>
          <li>Liên hệ hỗ trợ khi bạn cần.</li>
        </ul>
      </InfoSection>
      <InfoSection title="Chia sẻ thông tin">
        <ul>
          <li>Đối tác giao hàng nhận tên, số điện thoại và địa chỉ cần thiết để giao thiết bị.</li>
          <li>Đối tác thanh toán xử lý giao dịch chuyển khoản theo chính sách bảo mật của họ.</li>
        </ul>
      </InfoSection>
      <InfoSection title="Quyền của bạn">
        <p>Bạn có thể xem và cập nhật thông tin cá nhân, địa chỉ trong <Link href="/profile">hồ sơ</Link>. Để yêu cầu xoá tài khoản hoặc dữ liệu, vui lòng <Link href="/contact">liên hệ</Link>.</p>
      </InfoSection>
    </InfoPage>
  );
}
