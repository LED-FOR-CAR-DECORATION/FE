import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/layout/InfoPage";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: `Vận chuyển & đổi trả | ${SITE.name}`, description: "Thanh toán, giao hàng, bảo hành và đổi trả tại Lumintra." };

export default function ShippingReturnsPage() {
  return (
    <InfoPage title="Vận chuyển & đổi trả" currentHref="/shipping-returns" updatedAt="19/11/2026"
      intro="Thông tin về thanh toán, giao thiết bị, bảo hành và đổi trả cho từng loại sản phẩm.">
      <InfoSection id="payment" title="Thanh toán">
        <ul>
          <li>Đơn hàng và commission được thanh toán bằng mã QR chuyển khoản ngân hàng; hệ thống tự xác nhận khi nhận được giao dịch.</li>
          <li>Mỗi mã QR có thời hạn. Mã hết hạn thì tạo lại từ trang thanh toán của đơn hoặc commission.</li>
          <li>Báo giá commission có hiệu lực 72 giờ sau khi được duyệt; phí chỉnh sửa bổ sung có hiệu lực 24 giờ.</li>
        </ul>
      </InfoSection>
      <InfoSection id="shipping" title="Giao hàng thiết bị">
        <ul>
          <li>Sau khi nhân viên xác nhận đơn, thiết bị được giao qua đối tác Ahamove tới địa chỉ bạn đã chọn.</li>
          <li>Trạng thái giao hàng được cập nhật trong <Link href="/profile/orders">Đơn mua</Link>.</li>
          <li>Nhân vật, gói hội viên và commission là sản phẩm số, không cần giao hàng: chúng xuất hiện trong tài khoản của bạn.</li>
        </ul>
      </InfoSection>
      <InfoSection id="warranty" title="Bảo hành">
        <ul>
          <li>Bảo hành gắn với từng thiết bị LED đã mua và được ghi nhận trong hệ thống.</li>
          <li>Gửi yêu cầu tại <Link href="/profile/warranty">Bảo hành thiết bị</Link>, mô tả lỗi kèm tối đa 5 ảnh; nhân viên sẽ phản hồi kết quả xử lý.</li>
        </ul>
      </InfoSection>
      <InfoSection id="returns" title="Đổi trả">
        <ul>
          <li>Thiết bị lỗi do nhà sản xuất được xử lý theo bảo hành. Vui lòng <Link href="/contact">liên hệ</Link> trước khi gửi trả thiết bị.</li>
          <li>Sản phẩm số (nhân vật, gói hội viên) không đổi trả sau khi đã giao vào tài khoản.</li>
          <li>Commission: bạn có 7 ngày để chấp nhận hoặc yêu cầu chỉnh sửa bản xem trước; sau khi chấp nhận hoặc quá hạn, commission được xem là hoàn tất.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
