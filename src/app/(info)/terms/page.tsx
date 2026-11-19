import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/layout/InfoPage";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: `Điều khoản dịch vụ | ${SITE.name}` };

export default function TermsPage() {
  return (
    <InfoPage title="Điều khoản dịch vụ" currentHref="/terms" updatedAt="19/11/2026"
      intro={`Khi sử dụng website và dịch vụ của ${SITE.name}, bạn đồng ý với các điều khoản dưới đây.`}>
      <InfoSection title="1. Tài khoản">
        <ul>
          <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động trên tài khoản của mình.</li>
          <li>Thông tin đăng ký và địa chỉ giao hàng cần chính xác để đơn hàng được xử lý.</li>
        </ul>
      </InfoSection>
      <InfoSection title="2. Đặt hàng và thanh toán">
        <ul>
          <li>Giá hiển thị tại thời điểm đặt hàng được lưu lại trong đơn và không thay đổi sau đó.</li>
          <li>Đơn hàng và commission chỉ được xử lý sau khi thanh toán được xác nhận. Chi tiết tại <Link href="/shipping-returns">Vận chuyển & đổi trả</Link>.</li>
        </ul>
      </InfoSection>
      <InfoSection title="3. Nhân vật và quyền sử dụng">
        <ul>
          <li>Nhân vật mua từ cửa hàng được cấp quyền hiển thị trên thiết bị của bạn, không bao gồm quyền bán lại hay phân phối.</li>
          <li>Nội dung bạn gửi cho commission (mô tả, ảnh tham khảo) phải là nội dung bạn có quyền sử dụng và không vi phạm pháp luật.</li>
          <li>Chúng tôi có thể từ chối yêu cầu thiết kế có nội dung vi phạm bản quyền, thương hiệu hoặc không phù hợp.</li>
        </ul>
      </InfoSection>
      <InfoSection title="4. Commission">
        <ul>
          <li>Số lượt chỉnh sửa miễn phí phụ thuộc gói bạn chọn; chỉnh sửa vượt lượt có phí và chỉ thực hiện sau khi bạn xác nhận.</li>
          <li>Commission hoàn tất khi bạn chấp nhận bản xem trước, hoặc sau 7 ngày nếu không có phản hồi.</li>
        </ul>
      </InfoSection>
      <InfoSection title="5. Liên hệ">
        <p>Mọi thắc mắc về điều khoản, vui lòng <Link href="/contact">liên hệ</Link> với {SITE.team}.</p>
      </InfoSection>
    </InfoPage>
  );
}
