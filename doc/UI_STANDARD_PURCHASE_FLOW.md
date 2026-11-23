# Lumintra — Tiêu chuẩn UI & Audit luồng Mua hàng → Checkout

> Nguồn chuẩn: trang **Checkout** (`src/app/(customer)/checkout/page.tsx`) — phong cách *neo-brutalism*.
> Khung đánh giá: Railway *On Consideration* + 16 thẻ *Cards Against Bad Quality* (Clear · Precise · Efficient · Durable · Delightful) và bộ quy tắc của skill **ui-ux-pro-max** (đã cài tại `D:\SEP\.agents\skills\ui-ux-pro-max`).
> Ngày audit: 2026-11-23 · Nhánh FE: `dev` · Phạm vi: Customer, Staff, Manager trong luồng sản phẩm → giỏ → checkout → thanh toán → đơn hàng → xử lý đơn.

---

## 0. Quyết định đã chốt (decision log)

| # | Chủ đề | Quyết định |
|---|--------|-----------|
| D1 | Phạm vi style | **Khách: neo-brutal đầy đủ. Nội bộ (Staff/Manager): neo-brutal *lite*** — cùng token, viền đen 2px, không hover-lift, mật độ dày hơn. |
| D2 | Bảng màu | **`primary #89c89b` (nền, chữ đen) + `primary-ink #1f432b` (link, giá, nhấn)**. Xóa 5 mã xanh còn lại: `#155e59 #0F5B38 #126356 #198653 #2d6a4f` (và `#15803D` ở timeline staff). |
| D3 | Số điện thoại | **Di động VN, tự chuẩn hóa** → lưu dạng `0xxxxxxxxx`, regex `^0(3\|5\|7\|8\|9)\d{8}$`, lỗi inline tiếng Việt. |
| D4 | Phí ship & mock | **Nhất quán theo BE, xóa hết mock data**; chỉ giữ **giả lập thanh toán** (`mockPaymentSuccess`). |
| D5 | Tick đồng ý điều khoản | Bắt buộc ở: **Xác nhận đặt hàng**, **Khách hủy đơn**, **Xác nhận đã nhận hàng**. |
| D6 | Xóa | **Mục lẻ → Toast Undo 5s. Xóa hàng loạt / toàn bộ → Modal xác nhận có tên & số lượng.** |
| D7 | Địa chỉ | Bug ưu tiên: *lưu địa chỉ xong list trống* (xem §6). |

---

## 1. Tâm lý người dùng — họ muốn gì ở từng bước

| Bước | Role | Người dùng nghĩ gì | Thiết kế phải trả lời |
|------|------|--------------------|-----------------------|
| Chi tiết SP | Khách | "Cái này có hợp xe mình không, giá cuối bao nhiêu, mua nhanh được không?" | Giá rõ, CTA chính 1 cái, "Mua ngay" đưa thẳng tới checkout. |
| Giỏ hàng | Khách | "Mình đang trả bao nhiêu, có phí ẩn không, lỡ tay xóa có lấy lại được không?" | Tổng **khớp tuyệt đối** với checkout; xóa lẻ có Undo. |
| Checkout | Khách | "Giao tới đâu, cho ai, trả bằng gì, tổng cuối cùng, mình đang cam kết điều gì?" | Địa chỉ + SĐT đúng định dạng, phương thức thanh toán hiển thị, tick điều khoản, 1 nút xác nhận duy nhất. |
| Thanh toán / kết quả | Khách | "Tiền đã qua chưa? Nếu thoát ra thì đơn còn không?" | Trạng thái chờ rõ ràng, tự cập nhật, link về đơn. |
| Đơn của tôi | Khách | "Đơn đang ở đâu, khi nào tới, hủy được không, mất gì nếu hủy?" | Timeline, hành động hợp lệ theo trạng thái, hậu quả nói trước. |
| Xử lý đơn | Staff | "Đơn nào cần làm trước, làm đúng thiết bị chưa, bước này lùi được không?" | Danh sách ưu tiên, quét serial nhanh, nút không-lùi-được phải nói rõ. |
| Đơn nhân vật | Manager | "Có gì bất thường cần mình quyết không?" | Thông tin tóm tắt, hành động rõ ràng. |

---

## 2. Design Tokens (nguồn sự thật duy nhất — đặt trong `@theme` của `globals.css`)

### 2.1 Màu

| Token | Giá trị | Dùng cho | Cấm |
|-------|---------|----------|-----|
| `--color-primary` | `#89c89b` | Nền nút chính, nền summary giỏ, badge "Mặc định", trạng thái chọn (`bg-primary/10`) | Chữ trên nền trắng (tương phản thấp) |
| `--color-primary-dark` | `#6eb782` | Hover nền nút chính (nếu cần) | Chữ |
| `--color-primary-ink` *(mới, = studio-ink)* | `#1f432b` | Giá tiền, link, icon nhấn, accent checkbox/radio | — |
| `--color-border` | `#000000` | Mọi viền khung, đường phân cách chính | Viền `gray-200` cho card khách |
| `--color-text-main` | `#111111` | Chữ chính | — |
| `--color-text-muted` | `#555555` | Chữ phụ (7.5:1 trên trắng) | `gray-400` cho chữ có nghĩa |
| `--color-background` | `#fdfdfd` | Nền trang | `#f5f5f5`, `#fbfaf3` (đang lẫn) |
| Danger | `red-600` / nền `red-50` / viền `red-600` | Lỗi, xóa, hủy | — |
| Warning | `amber-800` / `amber-50` / viền `amber-600` | Chờ thanh toán | — |
| Success | `primary-ink` trên `primary/15` | Đã thanh toán, hoàn tất | `emerald-*` rời rạc |

**Quy tắc:** không viết hex trực tiếp trong component (`bg-[#…]`, `accent-[#…]`). Mọi màu đi qua token.

### 2.2 Typography
- Font: Inter (`--font-sans`). Body 14–16px, `line-height 1.5`.
- H1 trang: `text-3xl font-black uppercase` + icon 28px bên trái.
- Tiêu đề section/card: `font-black uppercase` (16px) + icon 18px, có `border-b-2 border-black pb-3 mb-4`.
- Nhãn input: `text-xs font-bold uppercase`.
- Tiền: `font-bold`/`font-black`, màu `primary-ink`, luôn qua `formatPrice()`.
- **Sàn:** không chữ mang nghĩa < 12px. `text-[10px]`/`text-[11px]` chỉ cho badge viết hoa đậm.

### 2.3 Hình khối
| Thuộc tính | Khách (full) | Nội bộ (lite) |
|-----------|--------------|---------------|
| Bo góc | `0` | `0` (tối đa `rounded-sm` cho chip) |
| Viền card | `border-2 border-black` | `border-2 border-black` |
| Bóng card | `shadow-[4px_4px_0_0_#000]` | `shadow-[2px_2px_0_0_#000]` |
| Bóng modal | `shadow-[6px_6px_0_0_#000]` | như khách |
| Hover nút | `-translate-y-0.5` + `shadow-[2px_2px_0_0_#000]` | không lift, chỉ đổi nền |
| Spacing | lưới 4px: card `p-5`, gap section `gap-5/6`, item `gap-3` | card `p-4`, gap `gap-3` |
| Đường tổng tiền | `border-t-2 border-dashed border-black` | như khách |

### 2.4 Chuyển động
- Thời lượng `120–180ms`, chỉ `transform` + `opacity`. Modal: fade 150ms + slide-up 200ms (giữ như `AddAddressModal`).
- **Cấm** animation lặp vô hạn trên trạng thái tĩnh (`animate-ping` ở màn thành công / badge "Đang hoạt động"). Chỉ cho phép `animate-spin` khi đang tải và `animate-pulse` cho chấm "đang chờ thanh toán".
- Tôn trọng `prefers-reduced-motion`.

---

## 3. Thư viện thành phần chuẩn

> Mục tiêu: mọi màn trong luồng dùng các class/component dưới đây, không tự chế lại.

### 3.1 Khung trang
```tsx
<main className="flex-1 bg-background py-10">
  <div className="container mx-auto max-w-5xl px-4">
    <div className="mb-8 flex items-center gap-3">
      <Icon size={28} /><h1 className="text-3xl font-black uppercase">Tiêu đề</h1>
    </div>
    …
```

### 3.2 Card / Section — `.neo-box-no-hover`
- Card tĩnh: `.neo-box-no-hover bg-white p-5`. Card bấm được (link sang trang khác): `.neo-box`.
- Header section: `flex items-center justify-between gap-3 border-b-2 border-black pb-3 mb-4` — trái: icon + tiêu đề; phải: hành động phụ (`btn-primary` cỡ xs).

### 3.3 Nút
| Biến thể | Class | Khi nào |
|----------|-------|---------|
| Primary | `.btn-primary` | **1 hành động chính / màn**: Mua ngay, Mua hàng, Xác nhận đặt hàng, Lưu địa chỉ |
| Secondary | `.btn-secondary` | Hành động phụ: Tiếp tục mua sắm, Xem chi tiết đơn |
| Danger *(mới)* | `.btn-danger` = `bg-red-600 text-white border-2 border-black` + hover như primary | Xác nhận xóa/hủy trong modal |
| Link | `text-xs font-bold text-primary-ink hover:underline` | Đặt làm mặc định, Theo dõi |
| Link danger | `text-xs font-bold text-text-muted hover:text-red-600 hover:underline` | Xóa mục lẻ |

Cỡ: CTA chốt đơn `py-4 text-lg w-full`; thường `px-4 py-2`; nhỏ `px-3 py-1.5 text-xs`. **Vùng chạm ≥ 44×44px** (nút icon 36px phải có padding bù).

Trạng thái bắt buộc:
- `:focus-visible` → `outline-2 outline-offset-2 outline-black` (**hiện chưa có** — thêm vào `.btn-*`).
- `disabled` → `opacity-60 cursor-not-allowed`, bỏ hover lift, **luôn kèm dòng giải thích bên dưới** (“Chọn địa chỉ giao hàng để tiếp tục”, “Tick đồng ý điều khoản để đặt hàng”).
- `loading` → giữ nguyên độ rộng, đổi nhãn sang động từ đang diễn ra (“Đang xử lý đơn hàng…”), `aria-busy`.

### 3.4 Thẻ chọn (radio card) — mẫu địa chỉ ở Checkout
- Dùng `<label>` bọc toàn thẻ (không `div onClick`), radio `accent-[var(--color-primary-ink)]`.
- Chưa chọn: `border-2 border-black hover:bg-gray-50`; Đã chọn: `border-2 border-primary-ink bg-primary/10`.
- Dòng 1: **Tên · SĐT (định dạng `0912 345 678`)** + badge "Mặc định"; dòng 2: địa chỉ; dòng 3: link phụ (Đặt mặc định · Sửa · Xóa) — `stopPropagation`.

### 3.5 Input
```tsx
<label htmlFor={id} className="mb-1 block text-xs font-bold uppercase">Số điện thoại <span aria-hidden className="text-red-600">*</span></label>
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-ink" size={15}/>
  <input id={id} aria-invalid={!!err} aria-describedby={`${id}-hint ${id}-err`}
    className="w-full border-2 border-black bg-gray-50 py-2 pl-9 pr-3 text-sm font-medium
               focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black
               aria-[invalid=true]:border-red-600" />
</div>
<p id={`${id}-hint`} className="mt-1 text-xs text-text-muted">VD: 0912 345 678</p>
<p id={`${id}-err`} role="alert" className="mt-1 text-xs font-bold text-red-600">{err}</p>
```
- **Label luôn hiển thị**, placeholder chỉ là ví dụ.
- Validate **on blur** + khi submit; lỗi nằm **ngay dưới ô**, không chỉ hộp lỗi chung.
- Khi submit lỗi: focus vào ô lỗi đầu tiên.
- `outline-none` không kèm `focus-visible` là **cấm**.

### 3.6 Checkbox đồng ý điều khoản *(mới)*
```tsx
<label className="flex items-start gap-3 border-2 border-black bg-white p-3 text-sm">
  <input type="checkbox" required checked={agreed} onChange={…} className="mt-0.5 h-4 w-4 accent-[var(--color-primary-ink)]"/>
  <span>Tôi đã đọc và đồng ý với <a href="/terms" target="_blank" className="font-bold underline">Điều khoản sử dụng</a>, …</span>
</label>
```
- **Không tick sẵn**, reset mỗi lần mở modal/trang.
- Đặt **ngay trên nút** mà nó mở khóa. Nút disabled + dòng giải thích khi chưa tick.
- Link mở tab mới để không mất dữ liệu đang điền.

### 3.7 Thông báo
| Loại | Mẫu |
|------|-----|
| Lỗi chặn (sau submit) | `role="alert" border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700` + icon `AlertCircle` — giữ như Checkout |
| Thành công tại chỗ | `border-2 border-black bg-primary/15 p-3 text-sm font-bold` + `CheckCircle` |
| Chờ / cảnh báo | `border-2 border-amber-600 bg-amber-50 text-amber-800` + `Clock` |
| Toast Undo | Góc dưới, `.neo-box-no-hover bg-white px-4 py-3`, “Đã xóa ‘{tên}’” + nút **Hoàn tác**, tự đóng 5s, `aria-live="polite"` |

Thông điệp lỗi: **nguyên nhân + cách sửa**, tiếng Việt, không lộ message kỹ thuật BE (`recipientPhone must contain…`).

### 3.8 Modal
- Khung: `border-2 border-black shadow-[6px_6px_0_0_#000]`, title bar `border-b-2 border-black` + nút đóng `X` (bỏ nút “Thu nhỏ” giả).
- Focus vào phần tử đầu khi mở, trap Tab, `Esc` đóng, trả focus về nút mở.
- **Form đã có dữ liệu thì bấm nền ngoài không đóng** (hoặc hỏi “Bỏ thay đổi?”).
- Footer: `[Secondary: Giữ lại / Hủy]` trái — `[Primary/Danger: động từ cụ thể]` phải. Nhãn nút nói đúng hậu quả (“Hủy đơn #123”, không “OK”).
- Modal chỉ đóng **sau khi API thành công**; lỗi hiện trong modal, giữ nguyên dữ liệu.

### 3.9 Trạng thái trống / tải
- Tải: skeleton cùng kích thước khối thật (tránh layout shift); chữ “Đang tải…” chỉ là fallback.
- Trống: `.neo-box-no-hover p-12 text-center` + icon 42px `text-primary-ink` + 1 câu + 1 CTA (như Giỏ hàng trống).

### 3.10 Mã đơn & số liệu
- Mã đơn hiển thị **một định dạng duy nhất** cho mọi role: `#{id}` (Staff đang dùng `#ORD-{id}`).
- Trạng thái luôn qua bảng nhãn tiếng Việt — **không** hiển thị enum thô (`CANCELED`).
- SĐT hiển thị dạng nhóm `0912 345 678`.

### 3.11 Biến thể *lite* cho Staff/Manager
Giữ: viền đen 2px, token màu, tiêu đề `font-black uppercase`, nút `.btn-*`. Đổi: bóng 2px, không hover-lift, `p-4`, bảng dày (row 40px), cho phép `text-xs` trong bảng. Bỏ: `rounded-xl`, `shadow-sm/xl`, viền `gray-200`, nền `#f5f5f5`.

---

## 4. Quy tắc validate (FE chạy trước khi gửi BE)

Đặt tại `src/lib/validation/contact.ts`, dùng chung cho Địa chỉ, Hồ sơ, Tạo user.

```ts
/** Trả về '0xxxxxxxxx' hoặc null. Chấp nhận khoảng trắng, chấm, gạch, ngoặc, +84/84. */
export function normalizeVnMobile(raw: string): string | null {
  let d = raw.replace(/[\s.\-()]/g, "");
  if (d.startsWith("+84")) d = "0" + d.slice(3);
  else if (/^84\d{9}$/.test(d)) d = "0" + d.slice(2);
  return /^0(3|5|7|8|9)\d{8}$/.test(d) ? d : null;
}
export const formatVnMobile = (p: string) => p.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");

export const RECIPIENT_NAME = /^[\p{L}][\p{L}\s.'-]{1,99}$/u;   // 2–100 ký tự, chỉ chữ
export const HOUSE_DETAIL   = /^[\p{L}\p{N}\s,./#-]{2,100}$/u;  // số nhà, hẻm, tòa
```

| Trường | Bắt buộc | Quy tắc | Thông điệp lỗi |
|--------|----------|---------|----------------|
| Họ tên người nhận | ✔ | trim, `RECIPIENT_NAME` | “Họ tên chỉ gồm chữ cái, 2–100 ký tự.” |
| SĐT | ✔ | `normalizeVnMobile() !== null` | “Số điện thoại chưa đúng. Nhập số di động 10 chữ số, VD 0912 345 678.” |
| Vị trí trên bản đồ | ✔ | có `latitude` + `longitude` thật (**cấm fallback toạ độ giả `10.7769, 106.7009`**) | “Hãy tìm hoặc bấm chọn vị trí trên bản đồ.” |
| Số nhà / hẻm / tòa | ✔ (đề xuất) | `HOUSE_DETAIL` | “Nhập số nhà, hẻm hoặc tòa nhà (2–100 ký tự).” |
| `fullAddress` ghép | — | `${house}, ${mapAddress}` ≤ **255** (giới hạn BE) | “Địa chỉ quá dài, hãy rút gọn phần số nhà.” |

BE (`AddUserAddressRequest`) đang nhận `^\+?[0-9]{8,15}$` — giá trị đã chuẩn hóa `0xxxxxxxxx` luôn hợp lệ phía BE. Khuyến nghị BE siết theo cùng regex VN để hai phía đồng bộ.

---

## 5. Mẫu hành động quan trọng

### 5.1 Tick đồng ý (D5)
| Hành động | Nội dung checkbox | Nút mở khóa |
|-----------|------------------|-------------|
| Xác nhận đặt hàng | “Tôi đã đọc và đồng ý với **Điều khoản sử dụng**, **Chính sách bảo mật** và **Chính sách vận chuyển & đổi trả**.” | Xác nhận đặt hàng |
| Khách hủy đơn | “Tôi hiểu đơn #{id} sẽ bị hủy và việc hoàn tiền (nếu đã thanh toán) áp dụng theo **Chính sách đổi trả**.” | Hủy đơn #{id} |
| Xác nhận đã nhận hàng | “Tôi đã nhận và kiểm tra hàng. Sau khi xác nhận, đơn sẽ hoàn tất và **không thể hoàn tác**.” | Xác nhận đã nhận hàng |

### 5.2 Xóa (D6)
| Hành động | Cơ chế |
|-----------|--------|
| Xóa 1 sản phẩm trong giỏ | Ẩn ngay + Toast Undo 5s, hết hạn mới gọi API |
| Xóa 1 địa chỉ | Như trên. Nếu là địa chỉ **mặc định** → toast nói rõ địa chỉ nào sẽ thành mặc định |
| Xóa đã chọn / Xóa toàn bộ giỏ | Modal: “Xóa {n} sản phẩm khỏi giỏ?” — [Giữ lại] [Xóa {n} sản phẩm] |
| Staff hủy đơn | Modal danger + ô lý do bắt buộc, trạng thái hiển thị bằng nhãn tiếng Việt |

---

## 6. Audit theo màn hình

Ký hiệu: **P0** sai dữ liệu/chặn luồng · **P1** bất đồng bộ/khả dụng · **P2** đánh bóng. Cột *Railway* = thẻ bị vi phạm.

### 6.1 Customer — Chi tiết sản phẩm `products/[productId]/page.tsx`
| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| C1 | Style riêng: nền `#fbfaf3`, chữ `#173c35`, nút `rounded bg-[#126356]` — 24 hex cứng | Precise / Composition | P1 | Chuyển sang `.btn-primary`/`.btn-secondary`, `neo-box-no-hover`, token |
| C2 | “Mua ngay” đẩy về `/cart` thay vì checkout với đúng sản phẩm đã chọn | Efficient · Step Minimization | P1 | Thêm vào giỏ → chỉ chọn item đó → `/checkout` |
| C3 | Chưa đăng nhập → `/login` không có `returnUrl`, mất ngữ cảnh | Precise · Spatial Continuity | P1 | `/login?returnUrl=/products/{id}` |
| C4 | Sau “Thêm vào giỏ” chỉ đổi nhãn nút (+ số đếm ở Header), không có lối tắt sang giỏ | Clear · feedback tương xứng | P2 | Toast “Đã thêm · Xem giỏ” |

### 6.2 Customer — Giỏ hàng `cart/page.tsx`
| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| G1 | **Phí ship giả** 30.000đ (<500k) trong khi Checkout & BE = 0 → tổng hai trang lệch | Precise · Accurate Representation | **P0** | Xóa logic mock; phí ship lấy từ BE (hiện 0 → “Miễn phí”) |
| G2 | “Xóa toàn bộ” / “Xóa đã chọn” xóa ngay, không hỏi, không undo | Durable · Reversible | **P0** | Modal theo §5.2 |
| G3 | Xóa lẻ không có Undo | Durable · Reversible | P1 | Toast Undo |
| G4 | CTA “Mua hàng” dùng `.btn-secondary` (trắng) trên nền primary — khác Checkout dùng `.btn-primary` | Precise / Composition | P1 | Summary nền trắng như Checkout, CTA `.btn-primary w-full py-3` |
| G5 | Checkbox `accent-[#155e59]`, nền chọn `#f3faf5` (hex lạ) | Precise | P1 | `accent primary-ink`, `bg-primary/10` |
| G6 | Ảnh thiếu hiển thị chữ `[IMG]` | Clear | P2 | Placeholder icon `Package` |
| G7 | Nút +/- 36px, nút xóa icon `p-2` < 44px | ui-ux-pro-max: Touch ≥44 | P2 | Tăng vùng chạm |
| G8 | Loading cả trang là 1 dòng chữ | Clear · trạng thái hệ thống | P2 | Skeleton 3 dòng item |

### 6.3 Customer — Checkout `checkout/page.tsx` (trang chuẩn, vẫn còn lỗi)
| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| K1 | **Không có tick đồng ý điều khoản** trước “Xác nhận đặt hàng” | Clear · đoán được hậu quả | **P0** | §3.6 + §5.1 |
| K2 | Không hiển thị phương thức thanh toán (code cứng `SEPAY`) | Clear · biết điều gì sẽ xảy ra | P1 | Section “Thanh toán”: thẻ radio SePay VietQR đã chọn sẵn + mô tả “Quét QR sau khi đặt” |
| K3 | Tóm tắt thiếu dòng Tạm tính / Phí vận chuyển / ảnh nhỏ | Precise | P1 | 3 dòng: Tạm tính · Vận chuyển · **Tổng** (nét đứt) |
| K4 | Đơn chỉ sản phẩm số gửi **địa chỉ giả** “Digital delivery” | Precise · Accurate | P1 | Không render section địa chỉ, không gửi address; hiển thị “Sản phẩm số — kích hoạt ngay trong tài khoản” |
| K5 | Nút disabled khi thiếu địa chỉ nhưng không nói vì sao | Precise · Disabled rõ ràng | P1 | Dòng giải thích dưới nút |
| K6 | Xóa địa chỉ ngay trong list, không Undo; lỗi khi xóa/đặt mặc định bị nuốt (`console.error`) | Durable | P1 | Toast Undo + hiện lỗi |
| K7 | Thẻ địa chỉ là `div onClick`; radio chưa dùng token | a11y | P2 | `<label>` + `accent primary-ink` |
| K8 | CTA chốt đơn nằm ở cột trái dưới list địa chỉ; trên mobile phải cuộn qua summary | Clear · Place | P2 | Desktop: CTA ở cuối `aside` sticky; Mobile: thanh CTA dính đáy kèm tổng tiền |

### 6.4 Customer — Modal thêm địa chỉ `components/ui/AddAddressModal.tsx` + `AddressContext`
**Bug D7 — “lưu xong list không hiện gì”. Nguyên nhân gốc (đọc code):**
1. `AddressContext.addAddress` bắt lỗi rồi chỉ `console.error` → API thất bại vẫn coi như xong.
2. `AddAddressModal.handleSave` gọi `onSave(form)` **không await** rồi `onClose()` ngay → modal đóng bất kể kết quả.
3. Không có regex SĐT ở FE → BE trả 400 khi số có gạch/chấm/ngoặc (`^\+?[0-9]{8,15}$`), hoặc `fullAddress` từ Goong > 255 ký tự → bị (1)+(2) che mất.
4. `refreshAddresses` lỗi cũng `setAddresses([])` im lặng.
→ Kết quả: người dùng thấy modal đóng “thành công” nhưng list trống. *(Cần xác nhận lỗi 400 cụ thể bằng tab Network khi chạy dev; luồng nuốt lỗi thì chắc chắn có.)*

| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| A1 | Bug D7 ở trên | Durable · Error Recovery | **P0** | `addAddress` ném lỗi lên; modal `await`, chỉ đóng khi OK, hiện lỗi đã dịch, **giữ dữ liệu** |
| A2 | Không regex SĐT/tên | Durable · validate chủ động | **P0** | §4, validate on blur |
| A3 | Fallback toạ độ giả `10.7769, 106.7009` trong `apiAddAddress` | Precise | P1 | Xóa, bắt buộc toạ độ thật |
| A4 | Lỗi gom 1 hộp chung, không gắn vào ô | ui-ux-pro-max Forms | P1 | Lỗi inline + `aria-describedby` |
| A5 | Nút “Thu nhỏ” thực chất là đóng; bấm nền ngoài làm mất form đang điền | Precise · đúng như vẻ ngoài | P1 | Bỏ nút Thu nhỏ; chặn đóng khi form có dữ liệu |
| A6 | Không có ô số nhà / ghi chú | Clear | P1 | Thêm `HOUSE_DETAIL` (§4) |
| A7 | Input `outline-none` không có focus ring; không focus trap | a11y | P1 | §3.5, §3.8 |
| A8 | Khung `bg-[#d9d9d9]` kiểu cửa sổ retro khác các modal khác | Precise | P2 | Chuẩn modal §3.8 (giữ title bar nhưng dùng token) |
| A9 | Badge “Đã chọn từ Goong Map” dùng `emerald-*`, lộ toạ độ thô | Minimalism | P2 | Badge success token; ẩn toạ độ |

### 6.5 Customer — Kết quả / thanh toán `checkout/result` + `SePayOrderPaymentCard`
| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| R1 | `animate-ping` lặp vô hạn ở biểu tượng thành công | Physical Authenticity · không lặp | P2 | Hiệu ứng 1 lần (scale-in 180ms) |
| R2 | Card thanh toán trộn `rounded-*`, `shadow-*`, `emerald-*` với `neo-box` | Precise | P1 | Đồng bộ token & khung |
| R3 | Màn chờ: hai nút đều `.btn-secondary`, không có hành động chính | Composition · visual weight | P2 | “Tôi đã chuyển khoản – Kiểm tra lại” là primary |
| R4 | Nút giả lập thanh toán | — | Giữ (D4) | Gắn nhãn rõ “Giả lập (DEV)” và ẩn ở build production |

### 6.6 Customer — Đơn của tôi `profile/orders` + `profile/orders/[orderId]`
| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| O1 | Style SaaS mềm: `rounded-xl` (38 lần ở trang chi tiết), viền `gray-200`, nền `#f5f5f5`, nút `#155e59` | Precise | P1 | Chuyển sang full neo-brutal |
| O2 | Danh sách dùng `window.confirm` cho “Đã nhận hàng”, trang chi tiết dùng modal — 2 cách cho 1 hành động | Precise | P1 | Một modal chung + tick §5.1 |
| O3 | Hủy đơn chưa có tick hiểu chính sách hoàn tiền | Clear | **P0** (D5) | §5.1 |
| O4 | Xác nhận nhận hàng chưa có tick “không thể hoàn tác” | Clear | **P0** (D5) | §5.1 |
| O5 | Type `MockOrder` dùng cho dữ liệu thật | Precise (code) | P2 | Đổi tên `Order` khi dọn mock |

### 6.7 Staff — `staff/orders` + `staff/orders/[orderId]` (1.518 dòng)
| # | Phát hiện | Railway | Mức | Sửa |
|---|-----------|---------|-----|-----|
| S1 | Style SaaS (`rounded-xl` ×60, `shadow-sm/xl`, `#0F5B38`, `#15803D`, `#1E293B`) | Precise | P1 | Chuyển sang neo-brutal *lite* §3.11 |
| S2 | Mã đơn `#ORD-{id}` ≠ `#{id}` của khách → staff đọc mã cho khách bị lệch | Precise | P1 | Dùng `#{id}` |
| S3 | Modal hủy hiển thị enum thô `CANCELED` | Clear | P1 | Nhãn “Đã hủy” |
| S4 | Form đóng gói có giá trị mặc định kiểu mock: `remarks = "Handle fragile LED package with care"` (tiếng Anh), `weight = 1.5`, `SGN-BIKE` | Precise / D4 | P1 | Ghi chú rỗng + gợi ý tiếng Việt; cân nặng lấy từ dữ liệu SP nếu có |
| S5 | `ahamove.service.ts` là “Frontend mock adapter” với toạ độ cửa hàng cứng | D4 | P1 | Xác nhận còn dùng không; nếu đã có BE dispatch thì xóa |
| S6 | “Đóng gói hàng” gửi đơn AhaMove (không lùi được) nhưng nhãn nút không nói hậu quả | Clear | P1 | Nhãn “Đóng gói & gọi AhaMove”, mô tả hậu quả trong modal |
| S7 | Badge `animate-ping` “Đang hoạt động” lặp mãi | Physical Authenticity | P2 | Chấm tĩnh |
| S8 | Ô serial: tốt (hỗ trợ quét). Cần auto-focus & Enter để liên kết | Efficient | P2 | `autoFocus`, submit on Enter |

### 6.8 Manager — `manager/character-orders/[orderId]`
| # | Phát hiện | Mức | Sửa |
|---|-----------|-----|-----|
| M1 | Đã dùng `neo-box` + `btn-primary` — **gần chuẩn nhất trong nội bộ** | — | Chỉ áp token màu & *lite* shadow |

---

## 7. Backlog sửa (thứ tự đề xuất)

**P0 — sai dữ liệu / thiếu cam kết pháp lý**
1. A1 + A2 + A3: sửa bug lưu địa chỉ, regex SĐT/tên, bỏ toạ độ giả.
2. G1: xóa phí ship mock ở giỏ, đồng bộ với Checkout/BE.
3. K1, O3, O4: tick đồng ý ở 3 hành động (component `ConsentCheckbox` dùng chung).
4. G2: modal xác nhận xóa hàng loạt.

**P1 — bất đồng bộ UI/UX**
5. Token màu (D2): thêm `--color-primary-ink`, xóa 6 mã xanh lẻ; thêm `.btn-danger`, focus ring cho `.btn-*`.
6. Tạo component dùng chung: `PageHeader`, `SectionCard`, `FormField`, `ConsentCheckbox`, `UndoToast`, `ConfirmDialog`, `StatusBadge`, `OrderSummary`.
7. Chuyển Chi tiết SP, Đơn của tôi, Card thanh toán sang full neo-brutal; Staff sang *lite*.
8. K2–K6, C2, C3, S2–S6, O2.

**P2 — đánh bóng**
9. Animation lặp, vùng chạm, skeleton, CTA dính đáy mobile, placeholder ảnh.

---

## 8. Checklist trước khi ship (cho mọi màn trong luồng)

1. **Clear** — Nhìn 3 giây biết màn làm gì và nút chính ở đâu? Chỉ **1** `.btn-primary`?
2. **Precise** — Không còn hex cứng, `rounded-*`, viền `gray-200`? Tổng tiền khớp giữa Giỏ ↔ Checkout ↔ Đơn? Mã đơn `#{id}`? Nút disabled có lý do?
3. **Efficient** — Đã chọn sẵn mặc định (địa chỉ mặc định, SePay)? “Mua ngay” đi thẳng checkout? Login có `returnUrl`?
4. **Durable** — Xóa lẻ có Undo, xóa hàng loạt có modal? API lỗi thì **hiện lỗi và giữ dữ liệu**, không `console.error` im lặng? Validate on blur?
5. **Consent** — 3 hành động D5 có tick, không tick sẵn?
6. **A11y** — Label hiển thị, `focus-visible`, modal trap focus + Esc, vùng chạm ≥44px, tương phản ≥4.5:1?
7. **Motion** — 120–180ms, chỉ transform/opacity, không `animate-ping` lặp, có `prefers-reduced-motion`?
8. **Mock** — Không còn dữ liệu giả ngoài nút **Giả lập thanh toán (DEV)**?
