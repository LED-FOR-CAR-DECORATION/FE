# UI and Figma route inventory

Updated 2026-10-19. The application routes below each have a named wireframe in the LEDSCREEN file. Existing exploratory frames are retained; the new editable screens sit to the right of the original canvas on Explore.

Coverage: 41 application page routes, 27 new editable wireframes (including form/state variants), and renamed original wireframes. A preview is available in `docs/figma-users-preview.png`.

Naming: `/route — Screen purpose`; use `[productId]` and `[orderId]` for dynamic segments. Forms and state variants add a suffix in parentheses. Legacy and unsupported concepts are explicitly labelled.

## Route mapping

| Route | Source | Figma wireframe |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | [/ — Home / Product Discovery](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2004-3) |
| `/about` | `src/app/(customer)/about/page.tsx` | [/about — Thể hiện cá tính qua từng điểm sáng.](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1985) |
| `/admin` | `src/app/admin/page.tsx` | [/admin — Khu vực quản trị](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1755) |
| `/admin/assignments` | `src/app/admin/assignments/page.tsx` | [/admin/assignments — Gán vai trò và quyền](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1516) |
| `/admin/permissions` | `src/app/admin/permissions/page.tsx` | [/admin/permissions — Quản lý quyền hạn](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1455) |
| `/admin/profile` | `src/app/admin/profile/page.tsx` | [/admin/profile — Thông tin tài khoản](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1940) |
| `/admin/reports` | `src/app/admin/reports/page.tsx` | [/admin/reports — Báo cáo và thống kê](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1794) |
| `/admin/roles` | `src/app/admin/roles/page.tsx` | [/admin/roles — Quản lý vai trò](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1379) |
| `/admin/users` | `src/app/admin/users/page.tsx` | [/admin/users — Quản lý người dùng](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1315) |
| `/cart` | `src/app/(customer)/cart/page.tsx` | [/cart — Shopping Cart](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2127-187) |
| `/checkout` | `src/app/(customer)/checkout/page.tsx` | [/checkout — Checkout](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2146-205) |
| `/checkout/result` | `src/app/(customer)/checkout/result/page.tsx` | [/checkout/result — Payment Success](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2571-996) |
| `/commission` | `src/app/(customer)/commission/page.tsx` | [/commission — Thiết kế Character theo yêu cầu](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-2014) |
| `/login` | `src/app/(auth)/login/page.tsx` | [/login — Login](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2070-72) |
| `/manager` | `src/app/(staff)/manager/page.tsx` | [/manager — Xin chào, Manager 123!](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2779-1034) |
| `/manager/profile` | `src/app/(staff)/manager/profile/page.tsx` | [/manager/profile — Thông tin tài khoản](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1895) |
| `/products` | `src/app/(customer)/products/page.tsx` | [/products — Product Catalog](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2501-383) |
| `/products/[productId]` | `src/app/(customer)/products/[productId]/page.tsx` | [/products/[productId] — Product Detail](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2107-107) |
| `/profile` | `src/app/(customer)/profile/page.tsx` | [/profile — Profile Overview](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2719-771) |
| `/profile/account` | `src/app/(customer)/profile/account/page.tsx` | [/profile/account — Account Information](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2731-779) |
| `/profile/addresses` | `src/app/(customer)/profile/addresses/page.tsx` | [/profile/addresses — Saved Addresses](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2746-1083) |
| `/profile/devices` | `src/app/(customer)/profile/devices/page.tsx` | [/profile/devices — Thiết bị của tôi (Current code)](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-2104) |
| `/profile/gallery` | `src/app/(customer)/profile/gallery/page.tsx` | [/profile/gallery — Character Gallery](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2751-1604) |
| `/profile/orders` | `src/app/(customer)/profile/orders/page.tsx` | [/profile/orders — My Orders](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2614-1649) |
| `/profile/orders/[orderId]` | `src/app/(customer)/profile/orders/[orderId]/page.tsx` | [/profile/orders/[orderId] — Customer Order Detail](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2606-1324) |
| `/profile/security` | `src/app/(customer)/profile/security/page.tsx` | [/profile/security — Bảo mật tài khoản (Current code)](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-2070) |
| `/profile/settings` | `src/app/(customer)/profile/settings/page.tsx` | [/profile/settings — Cài đặt](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-2046) |
| `/profile/subscriptions` | `src/app/(customer)/profile/subscriptions/page.tsx` | [/profile/subscriptions — Subscriptions (original user wireframe)](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2742-923) |
| `/register` | `src/app/(auth)/register/page.tsx` | [/register — Register](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2075-236) |
| `/staff` | `src/app/(staff)/staff/page.tsx` | [/staff — Xin chào, Staff 123!](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2779-1094) |
| `/staff/chat` | `src/app/(staff)/staff/chat/page.tsx` | [/staff/chat — Chatbox hỗ trợ](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1663) |
| `/staff/commission` | `src/app/(staff)/staff/commission/page.tsx` | [/staff/commission — Commission Management](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2457-432) |
| `/staff/commission/pricing` | `src/app/(staff)/staff/commission/pricing/page.tsx` | [/staff/commission/pricing — Cấu hình giá Commission](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1251) |
| `/staff/deliveries` | `src/app/(staff)/staff/deliveries/page.tsx` | [/staff/deliveries — Thông tin vận chuyển](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1572) |
| `/staff/inventory` | `src/app/(staff)/staff/inventory/page.tsx` | [/staff/inventory — Quản lý kho LED](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1001) |
| `/staff/orders` | `src/app/(staff)/staff/orders/page.tsx` | [/staff/orders — Order Management](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2537-760) |
| `/staff/orders/[orderId]` | `src/app/(staff)/staff/orders/[orderId]/page.tsx` | [/staff/orders/[orderId] — Chi tiết đơn hàng](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1620) |
| `/staff/pricing` | `src/app/(staff)/staff/pricing/page.tsx` | [/staff/pricing — Quản lý Store Listing](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1068) |
| `/staff/profile` | `src/app/(staff)/staff/profile/page.tsx` | [/staff/profile — Thông tin tài khoản](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1852) |
| `/staff/returns` | `src/app/(staff)/staff/returns/page.tsx` | [/staff/returns — Quản lý trả thiết bị](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1193) |
| `/staff/warranty` | `src/app/(staff)/staff/warranty/page.tsx` | [/staff/warranty — Quản lý bảo hành](https://www.figma.com/design/KMB4v4HtenNMtu8D0gyP13/LEDSCREEN?node-id=2775-1135) |

## Implementation boundaries

- New management tables support search, status filters, create/edit forms, validation and CSV export. Data is stored per demo account in browser localStorage.
- Commission requests are shared by the customer and staff demo workspaces within the same browser. Chat messages are a local simulation and are not transmitted.
- Role and permission configuration is a preview; changing those records does not change authentication or server authorization.
- Device entries and brightness are simulated; no physical pairing or firmware update occurs. Subscriptions follows the original user wireframe with active subscriptions and completed payment rows, using explicitly labelled preview data. No recurring billing API is connected. The duplicate empty-state Figma frame `2775:2133` is superseded; deleting it was blocked by the Starter MCP quota.
- Account editing uses the existing session provider; password changes use the existing mock auth service and demo OTP.
- Existing checkout uses COD/mock-card; the legacy saved-card concept is not a real payment integration.
- Staff and Manager dashboards show role-appropriate navigation and derive summaries from the corresponding local demo data.

## Validation

- `npm run build` (Next.js 16.4.0 production build and TypeScript).
- `node --experimental-strip-types --test tests/permissions.test.mjs` (Staff/Manager access, nested commission-pricing boundary, unknown paths and prefix collisions).
- Browser smoke checks cover management create/edit persistence and search, customer commission, navigation, and account pages.
- Customer commission creation is visible in the Staff workspace and Staff can update its status. Staff is redirected when opening Manager commission pricing. All Admin workspace routes were opened successfully.
- Mobile Admin layout was checked at 390 × 844 after correcting the sidebar labels; the document does not overflow horizontally.
- Figma layers are native editable frames/text/instances with Inter; no complete-screen raster was imported.

