import Link from "next/link";
export default function Footer() {
  return (
    <footer className="bg-primary border-t-2 border-black pt-12 pb-8">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="col-span-1 md:col-span-2">
          <h2 className="text-3xl font-black mb-4 tracking-tighter">MIRAGE<br/>TEAM</h2>
          <p className="text-sm max-w-md font-medium mb-4">
            Dự án bảng LED trang trí và LED dẻo Mirage được thực hiện bởi đội ngũ 5 thành viên.
            Chúng tôi mang đến trải nghiệm tốt hơn để khách hàng tùy chỉnh và thể hiện cá tính
            qua bảng LED ma trận trang trí và chợ sản phẩm nghệ thuật.
          </p>
          <Link href="/about#support" className="btn-secondary neo-box-no-hover inline-block py-1 text-sm">Kết nối với Mirage</Link>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-4 uppercase">Thông tin</h3>
          <ul className="flex flex-col gap-2 text-sm font-medium">
            <li><Link href="/about" className="hover:underline">Về chúng tôi</Link></li>
            <li><Link href="/about#support" className="hover:underline">Hỗ trợ</Link></li>
            <li><Link href="/profile/orders" className="hover:underline">Theo dõi đơn hàng</Link></li>
            <li><Link href="/commission" className="hover:underline">Thiết kế theo yêu cầu</Link></li>
            <li><Link href="/profile/security" className="hover:underline">Bảo mật tài khoản</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-4 uppercase">Khám phá</h3>
          <div className="flex flex-col gap-2 text-sm font-medium"><Link href="/products" className="hover:underline">Bảng LED và Character</Link><Link href="/profile/gallery" className="hover:underline">Gallery của bạn</Link><Link href="/profile/devices" className="hover:underline">Thiết bị của bạn</Link></div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 border-t-2 border-black pt-6 flex flex-col md:flex-row items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider">
          © 2026 Mirage Team. Bảo lưu mọi quyền.
        </p>
        <div className="bg-white border-2 border-black px-4 py-1 text-sm font-bold mt-4 md:mt-0">
          MIRAGE
        </div>
      </div>
    </footer>
  );
}
