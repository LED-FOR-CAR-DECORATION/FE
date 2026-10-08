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
          <button className="btn-secondary neo-box-no-hover py-1 text-sm">Liên hệ với chúng tôi!</button>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-4 uppercase">Thông tin</h3>
          <ul className="flex flex-col gap-2 text-sm font-medium">
            <li><a href="#" className="hover:underline">Về chúng tôi</a></li>
            <li><a href="#" className="hover:underline">Hỗ trợ kỹ thuật</a></li>
            <li><a href="#" className="hover:underline">Vận chuyển & đổi trả</a></li>
            <li><a href="#" className="hover:underline">Điều khoản dịch vụ</a></li>
            <li><a href="#" className="hover:underline">Chính sách bảo mật</a></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-4 uppercase">Mạng xã hội</h3>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-10 h-10 bg-white border-2 border-black rounded-full hover:bg-black transition-colors" />
            ))}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 border-t-2 border-black pt-6 flex flex-col md:flex-row items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider">
          © 2026 Mirage Team. Bảo lưu mọi quyền.
        </p>
        <div className="bg-white border-2 border-black px-4 py-1 text-sm font-bold mt-4 md:mt-0">
          Logo
        </div>
      </div>
    </footer>
  );
}
