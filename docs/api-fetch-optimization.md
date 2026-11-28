# Tối ưu API fetch (FE)

Nhánh: `perf/api-fetch-optimization` → PR vào `dev`. Mỗi mục là một commit riêng; xong mục nào thì review rồi mới làm mục tiếp theo.

## Tiến độ

- [x] 0. Đo baseline (Redis BE tắt có chủ đích)
- [x] A. Nền tảng TanStack Query + refresh token đa tab (`/users/me` đã chỉ 1 lượt/lần tải, không cần sửa)
- [x] B. Đơn hàng (OrderContext → query, chi tiết theo id, fulfillment)
- [x] C. Websocket hub + chat/inbox
- [x] D. Khách: gallery / store / subscription
- [x] E. Designer
- [x] F. Manager / Admin / Staff khác + địa chỉ chỉ tải khi cần (monitoring giữ nguyên: poll 15s là đúng)
- [ ] G. Đo lại toàn bộ, build/lint, mở PR

## Baseline

### Monitoring BE: 7 ngày (21/11 18:00 → 28/11 18:50), Redis tắt

Tổng 16.704 lượt · latency TB 1,33s · p95 5s · p99 8,29s · lỗi 5xx 0,09%

| Endpoint | Lượt gọi | TB | p95 |
|---|---|---|---|
| GET `/api/management/staff/orders/{id}` | **5.730 (34%)** | 2,21s | 8,29s |
| GET `/api/management/staff/orders` | 1.593 | 2,06s | 5s |
| GET `/api/management/commissions/pricing/rules/{ruleId}` | 98 | 2,61s | 6,27s |
| GET `/api/management/admin/store/products` | 92 | 2,35s | 7,95s |
| GET `/api/management/admin/dashboard/kpi` | 59 | 1,64s | 7,48s |
| GET `/api/management/admin/store/products/drafts` | 57 | 1,23s | 7,6s |
| GET `/api/management/admin/store/bundles` | 30 | 1,89s | 6,39s |
| GET `/api/management/admin/store/subscriptions` | 28 | 1,85s | 6,34s |
| GET `/api/management/commissions/pricing` | 16 | 2,49s | 5,33s |

### FE: số request API khi tải lần đầu (dev, tài khoản admin, 28/11)

Môi trường dev chạy React StrictMode nên một số effect chạy 2 lần; ở production con số thấp hơn, nhưng tỉ lệ giữa các trang vẫn đúng.

| Trang | Tổng request | Thời gian tới request cuối | Chi tiết |
|---|---|---|---|
| `/staff` | 45 | 13,3s | `staff/orders` ×18, `staff/orders/{id}` ×17, `management/commissions` ×6, `warranty-claims` ×2, `users/me` ×1, `auth/refresh` ×1 |
| `/staff/orders` | ≥64 (chưa xong sau 13s) | ≥13s | `staff/orders` ×18, `staff/orders/{id}` ×45+ |
| `/manager` | 42 | 12s | `staff/orders` ×18, `staff/orders/{id}` ×21, `dashboard/kpi` ×1, `products/drafts` ×1 |
| `/staff/chat` | 11 | 9,6s | `staff/orders` ×9 (**trang chat không cần đơn hàng**), `management/commissions` ×1 |
| `/admin/monitoring` | 3 | – | `users/me` ×1, `system/metrics` ×2 (gọi trùng khi mount) |
| Trang khách (`/products`, `/profile/*`, `/messages`) | – | – | Chưa đo: cần tài khoản khách |

Nguyên nhân chính: `OrderProvider` trong layout staff/manager tải mọi đơn (9 status × mọi trang) rồi gọi chi tiết từng đơn, mỗi lần vào layout, kể cả các trang không dùng đơn hàng.

## Sau mục B (đơn hàng)

Đo cùng điều kiện với baseline (dev, admin, lần tải đầu).

| Trang | Baseline | Sau B | Ghi chú |
|---|---|---|---|
| `/staff` | 45 (13,3s) | **18** (6,2s) | Hết fan-out chi tiết đơn; còn `staff/orders` ×9 (BE bắt buộc `status`), commissions ×6, warranty ×2 |
| `/staff/orders` | ≥64 (>13s) | **10** (9,5s) | Chỉ summary |
| `/manager` | 42 (12s) | **3** (5,5s) | Dashboard không còn tải đơn hàng |
| `/staff/chat` | 11 | 13 | Hết 9 lượt đơn hàng; phần còn lại là preview chat N+1 (mục C) |
| `/staff/orders/{id}` | ~50 | **6** | 1 chi tiết + LED models + bundle + instances (đều cache) |
| `/staff/deliveries` | ~46 | 45 lần đầu, **15** khi quay lại | Cần địa chỉ/vận đơn → chi tiết từng đơn; đơn đã kết thúc cache suốt phiên. Muốn giảm hẳn cần API BE #8 |
| `/manager/character-orders` (sau khi đã vào deliveries) | ~46 | **0** | Dùng lại cache |
| Quay lại trang đã xem trong 30s | tải lại toàn bộ | **0** | Cache TanStack |

## Sau mục C (chat / websocket)

| Tình huống | Trước | Sau |
|---|---|---|
| `/staff/chat` lần đầu | 13 (commissions ×2, messages ×10) | 13 → commissions ×1, messages ×10 (N+1 còn lại chờ API BE #3) |
| Mở một hội thoại từ hộp thư | +1 lịch sử + thông tin | **0 lịch sử** (dùng cache của hộp thư), chỉ thông tin commission |
| Rời hộp thư rồi quay lại trong 60s | tải lại danh sách + N lịch sử | **0** |
| Mất mạng → có mạng lại | chờ backoff tới 30s, vẫn hiện "Trực tuyến" khi socket chết | báo "Mất kết nối" ngay; kết nối lại ~15ms sau sự kiện `online` |
| Socket chết lặng (BE chưa có heart-beat) | không phát hiện, poll dự phòng bị tắt → mất tin | phòng đang mở đối chiếu REST mỗi 60s, thiếu tin thì kết nối lại |
| 3 lỗi STOMP liên tiếp | dừng realtime tới khi rời trang | tự thử lại sau 60s, khi quay lại tab, khi có mạng hoặc khi mở phòng khác |
| Đăng xuất / đổi tài khoản | socket giữ token cũ | đóng socket, xoá trạng thái từ chối; đăng nhập lại thì kết nối với token mới |
| Topic realtime của hộp thư | 50 | 20 (giảm kiểm quyền ở BE và phạm vi ảnh hưởng khi một topic bị từ chối) |

## Sau mục D (khách: store / gallery / gói hội viên)

Đo khi chưa đăng nhập (chưa có tài khoản khách để đo gallery).

| Tình huống | Trước | Sau |
|---|---|---|
| Trang chủ | `store/products?size=40` | 1 request catalogue (dùng chung) |
| `/` → `/products` | thêm catalogue (mọi trang) + tags | **chỉ tags** (catalogue dùng lại) |
| Chi tiết sản phẩm | chi tiết + 50 sản phẩm để lấy 4 "liên quan" | **1** (liên quan lọc từ catalogue đã cache) |
| `/subscriptions` lần đầu | 1 + N chi tiết gói | 1 + N (4) — chờ API BE |
| Quay lại `/products`, `/subscriptions` trong 5 phút | tải lại toàn bộ | **0** |
| Checkout: kiểm tra bundle có LED | chi tiết từng bundle mỗi lần | dùng cache chi tiết sản phẩm |
| Gallery: quay lại cửa sổ/tab | **2 lần** tải gallery (focus + visibilitychange), mỗi lần gọi chi tiết từng commission đã hoàn thành | chỉ khi dữ liệu cũ hơn 60s, 1 lần; chi tiết commission COMPLETED cache cả phiên |
| Gallery: vào `/profile/gallery` | gọi `refresh()` mỗi lần mount | dùng cache nếu còn mới |

## Kiểm tra lại mục B/D bằng tài khoản khách

| Tình huống | Kết quả |
|---|---|
| `/profile/orders` lần đầu | 1 danh sách + 22 chi tiết (khách cần item của từng đơn → API BE #6) |
| Mở chi tiết đơn từ danh sách, quay lại danh sách | **0** |
| Vào `/profile/gallery`, giả lập focus + visibilitychange | **0** (trước: 2 lượt gallery đầy đủ mỗi lần quay lại cửa sổ) |
| `/messages` lần đầu | `commissions/my` ×1 + lịch sử ×8 (chờ API BE #3); quay lại **0** |

## Sau mục E (designer)

| Chỗ | Trước | Sau |
|---|---|---|
| Studio `/designer/studio/{id}` | tải mọi trang nhân vật để tìm 1 | dùng chung cache danh sách (0 nếu vừa ở trang designer khác) |
| `/designer/publish`, `/designer/store-uploads` | mỗi trang tự tải toàn bộ | một cache chung, mọi thao tác ghi tự invalidate |
| Workspace commission: danh sách nhân vật COMMISSION | gọi **2 lần giống hệt** (trực tiếp + `findCommissionCharacter`) | 1 (cache) |
| Workspace commission: ảnh nhân vật cho mỗi thẻ | 1 request / thẻ | 1 request cho cả trang (lọc từ danh sách COMMISSION) |
| Workspace commission: poll chi tiết | 10s, không bao giờ dừng | 30s, dừng khi COMPLETED/CANCELLED/EXPIRED/REJECTED |
| `store/tags` ở trang đăng bán + modal | gọi trực tiếp (×2 khi mount) | cache chung 5 phút (×1) |
| Phiên bản nhân vật (`characters/{id}/versions`) | mỗi lần mở studio/đăng bán (×2 khi mount) | cache 30s, tạo/xoá phiên bản tự invalidate |

Đo bằng tài khoản designer:

| Tình huống | Request |
|---|---|
| `/designer/publish` lần đầu | `characters/my` ×1, `tags` ×1, `versions` ×1 |
| → studio → store-uploads → quay lại publish | **0 / 0 / 0** |
| `/designer/commissions` (danh sách, ≥3 thẻ) | `commissions/assigned` ×3 (3 status) + `characters/my?type=COMMISSION` ×1 (trước: 1/thẻ) |
| Mở workspace commission | **2** (chi tiết + versions); trước: chi tiết + COMMISSION ×2 + versions; không poll trong 25s (trước 10s/lần) |

## Sau mục F (manager / staff / admin / dùng chung)

| Trang / tình huống | Trước | Sau |
|---|---|---|
| `/staff` (tài khoản staff) | 45 (baseline), 18 (sau B) | **14**; quay lại **0** (đếm việc cần làm cache 30s, "Làm mới" bỏ cache) |
| `/staff/pricing` (Niêm yết & giá) | 9: `admin/store/products` ×5, `bundles` ×2, `subscriptions` ×2 | **4**; quay lại **0** |
| `/staff/commission/pricing` | 16: `pricing` ×2, `pricing/rules/{id}` ×14 | **8** (1 + 7 rule, chờ API BE #22); quay lại **0** |
| `/manager/inventory` sau trang giá | `admin/store/products` + `led-models` | chỉ `led-models` (sản phẩm LED dùng lại cache) |
| `/users/me/addresses` | **mọi trang** (provider ở root layout) | chỉ trang dùng địa chỉ (hồ sơ, checkout), cache 5 phút |

Mọi thao tác ghi sản phẩm/bundle/gói/tag/LED model gọi `markStoreChanged()` → bỏ cache quản lý và cache cửa hàng công khai.

## Bảng API BE còn thiếu (đề xuất, chờ duyệt)

FE không làm các mục này trong PR. Khi BE có API thì FE sẽ chuyển sang dùng.

| # | Ưu tiên | Endpoint đề xuất | Thay cho (FE hiện tại) | Màn hình | Tiết kiệm |
|---|---|---|---|---|---|
| 0a | P0 | **BE config:** STOMP `setHeartbeatValue(10000,10000)` + TaskScheduler (`WebSocketConfig.java`) | Kết nối chết vẫn "connected", mất tin | Chat | Gốc gây websocket chập chờn |
| 0b | P0 | **Cập nhật `swagger.json`** + regenerate client | ~30 endpoint gọi tay qua `request()` | Toàn app | Tránh API "thiếu" giả |
| 1 | P0 | `GET /api/management/staff/orders?status=A,B&q&sort&from&to&containsProductType&page&size`, summary nhúng customer/items/delivery/payment | 9 status × mọi trang + chi tiết từng đơn (`lib/api/orders.ts`) | Staff/Manager đơn | 5.730 + 1.593 lượt/tuần → ~1 lượt/trang |
| 2 | P0 | `GET /api/management/staff/orders/status-counts` → `{STATUS:n}` | Đếm client trên toàn bộ list | Staff orders, home | Bỏ phụ thuộc full list |
| 3 | P0 | `GET /api/commissions/conversations` & `/api/management/commissions/conversations?page&size&unreadOnly` → item + `lastMessage` + `unreadCount` | Tải toàn bộ lịch sử từng hội thoại để lấy tin cuối, lặp mỗi 60s | Inbox khách/staff | 1 + N (≤250) full-history → 1 |
| 4 | P0 | `GET /api/commissions/{id}/messages?after={id}` / `?before&limit` + `POST .../messages/read {lastMessageId}` | Reconnect/poll tải lại cả lịch sử; "đã đọc" lưu localStorage | Chat | Payload nhỏ; unread đúng mọi thiết bị |
| 5 | P1 | `GET /api/management/staff/orders/{id}/fulfillment-options` | Mọi LED model + instances IN_STOCK & ALL theo từng model × mọi trang | Staff fulfillment | 2 + B + 2M×pages → 1 |
| 6 | P1 | `GET /api/orders?expand=items,delivery,payment` (hoặc nhúng vào summary) | Đơn của tôi: mọi trang + chi tiết từng đơn | Profile orders | pages + N → 1 |
| 7 | P1 | Nhúng artwork commission vào `/api/customer/characters/owned` | Mọi commission COMPLETED + chi tiết từng cái | Gallery | pages + N → 0 |
| 8 | P1 | `GET /api/management/orders/character-sales?from&to` → `{items, totals}`; `GET /api/management/staff/deliveries` | Tổng/doanh thu tính client trên mọi đơn | Manager character-orders, deliveries | Bỏ full list |
| 9 | P1 | `GET /api/store/products?keyword&tags=a,b&sort&page&size` + `/api/store/products/facets` | Tải cả catalogue, lọc/sort/đếm client | `/products` | Mọi trang → 1 + 1 |
| 10 | P2 | `GET /api/store/products/{id}/related?limit=4` | Tải 50 sản phẩm để lấy 4 | Chi tiết sản phẩm | 50 dòng → 4 |
| 11 | P2 | Thêm `requiresShipping` vào cart item/product summary | Gọi chi tiết từng bundle | Checkout | N → 0 |
| 12 | P1 | `GET /api/management/characters/{id}` | Tải mọi nhân vật để tìm 1 | Designer studio | pages → 1 |
| 13 | P2 | Lọc `characterType=STORE&linkedToCommission=false` trên `/designer/characters/my`; đảm bảo `commissionId` luôn lưu | Parse `[COMMISSION #id]` trong description + lọc client | Designer publish | pages → 1 |
| 14 | P2 | Thêm `thumbnailUrl`, `latestVersion`, `widthPx/heightPx` vào designer character item | Thumbnail/kích thước lưu localStorage | Designer | Bỏ tải versions từng nhân vật |
| 15 | P1 | `GET /api/management/admin/store/products/{id}` + `/status-counts?productType`; `thumbnailUrl/updatedAt` trong summary bundle/subscription | Tải list size 200 để `.find`; join client lấy thumbnail | Manager store, inventory | `admin/store/products` TB 2,35s |
| 16 | P2 | `GET /api/management/admin/store/bundles/selectable-items` | Products + models + characters + versions từng nhân vật | Manager tạo bundle | 3 + N → 1 |
| 17 | P2 | `PATCH /api/management/admin/store/products/{id}/version {characterVersionId}` + creator/version thật | Fake db trong `store-listing.service.ts` | Manager listings | Đúng dữ liệu |
| 18 | P2 | Filter nhiều status + `sort` cho commission queue; `GET /api/management/commissions/counts?assigned=` | 1 call/status; đếm bằng nhiều call `size:1` | Designer/staff dashboard | 3–N → 1 |
| 19 | P2 | `status=A,B,C` + `sort` cho `/warranty-claims`; 1 endpoint role-aware | 3 status × mọi trang; thử URL manager rồi fallback staff | Warranty queue | 3×pages → 1 |
| 20 | P3 | `GET /api/management/admin/firmware/rollback-target?modelId` | Tải 100 release, sort semver client | Firmware deprecate | Nhỏ |
| 21 | P3 | Kênh STOMP theo user `/user/queue/commissions` | Inbox subscribe tới 20 topic | Inbox | 20 SUBSCRIBE → 1 |
| 22 | P1 | Trả `options` (và `description`, `dependsOn*`) trong `GET /api/management/commissions/pricing` | Gọi `pricing/rules/{id}` cho từng rule (7) | Cấu hình giá commission | 1 + 7 → 1; monitoring: `rules/{ruleId}` 98 lượt, TB 2,6s |
