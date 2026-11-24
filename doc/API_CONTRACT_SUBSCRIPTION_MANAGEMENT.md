# API Contract: Quản lý Gói Hội viên (Subscription Management)

Tài liệu đặc tả hợp đồng API dành cho đội ngũ phát triển Frontend và Backend phục vụ tính năng **Quản lý các Gói Hội viên (Subscription Plans)** dành cho quyền **MANAGER**.

---

## 1. Thông tin chung (General Information)

- **Base URL**: `http://localhost:8080` (hoặc domain môi trường deployment)
- **Chuẩn dữ liệu**: `application/json; charset=UTF-8`
- **Xác thực & Phân quyền (Authentication & RBAC)**:
  - Giao thức: `Bearer Token (JWT)`
  - Header: `Authorization: Bearer <access_token>`
  - Yêu cầu Role: `MANAGER` (`@PreAuthorize("hasRole('MANAGER')")`)
- **Quy ước phản hồi chuẩn (`ApiResponse<T>` Envelope)**:
  ```json
  {
    "code": "SUCCESS",
    "message": "Thành công",
    "data": { ... },
    "meta": null
  }
  ```

---

## 2. Quy trình tải ảnh đại diện gói (`thumbnailUrl`)

> [!IMPORTANT]
> Endpoint tạo/cập nhật Subscription chỉ nhận `thumbnailUrl` dạng URL `http://` hoặc `https://` (tối đa 500 ký tự). Frontend **không gửi file nhị phân (multipart)** trực tiếp vào các endpoint Subscription mà sử dụng **Media Service** theo luồng V4 Pre-signed URL:

1. **Xin Signed URL**: Gọi `POST /api/media/upload-url` với `purpose: "STORE_PRODUCT"`, `fileName`, `contentType` (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), `fileSize` (1 byte – 10MB).
2. **Tải file lên Cloud Storage**: Gửi `PUT` tới `signedUploadUrl` kèm file binary và các header được ký trong `X-Goog-SignedHeaders` (`Content-Type`, và `Cache-Control` / `x-goog-content-length-range` nếu có).
3. **Lưu URL công khai**: Lấy `publicUrl` trả về từ bước 1 (ví dụ: `https://cdn.lumintra.shop/...`) truyền vào trường `thumbnailUrl`.

---

## 3. Danh sách các API Quản lý Gói Hội viên

### 3.1. Tạo mới Gói Hội viên (Create Subscription)

- **Endpoint**: `POST /api/management/admin/store/subscriptions`
- **HTTP Status thành công**: `201 Created`
- **Controller**: `CreateSubscriptionController.java`
- **Use Case**: `CreateSubscriptionUseCase.java`
- **Phân quyền**: Role `MANAGER`

#### A. Request Headers
| Header | Giá trị | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | Có | JWT Token của tài khoản Manager |
| `Content-Type` | `application/json` | Có | Định dạng payload JSON |

#### B. Request Body Schema (`CreateSubscriptionRequest`)
| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Ràng buộc / Validation | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `planName` | `String` | **Có** | `@NotBlank`, `@Size(max = 255)`, tự động `.strip()` | Tên hiển thị của gói hội viên |
| `planCode` | `String` | **Có** | `@NotBlank`, `@Size(max = 100)`, tự động `.strip()`, duy nhất | Mã định danh duy nhất của gói (ví dụ: `PRO_MONTHLY`) |
| `basePrice` | `BigDecimal` | **Có** | `@NotNull`, `@DecimalMin("0")`, `@Digits(integer = 10, fraction = 2)` | Giá bán gói (VND) |
| `description` | `String` | Không | Văn bản tùy ý | Mô tả quyền lợi gói hội viên |
| `thumbnailUrl` | `String` | Không | `@Size(max = 500)`, `@URL`, `@Pattern(regexp = "https?://\\S+")` | URL ảnh đại diện gói |
| `isLifetime` | `Boolean` | **Có** | `@NotNull` | `true` nếu là gói vĩnh viễn, `false` nếu là gói có thời hạn |
| `durationDays` | `Integer` | **Có điều kiện** | `@Positive`; **bắt buộc** khi `isLifetime = false`, **phải là `null` / bỏ trống** khi `isLifetime = true` | Số ngày hiệu lực của gói |
| `allAccessCharacters` | `Boolean` | **Có** | `@NotNull` | `true` nếu mở khóa toàn bộ Character trên hệ thống |
| `tagIds` | `List<Long>` | Không | Mỗi phần tử `@NotNull`, `@Positive` | Danh sách ID thẻ phân loại gắn cho sản phẩm |

#### C. Quy tắc nghiệp vụ (Business Rules)
1. **Kiểm tra trùng mã gói (`planCode`)**: Nếu `planCode` đã tồn tại trong `SUBSCRIPTION_DETAIL`, hệ thống trả về `409 Conflict` (`PLAN_CODE_ALREADY_EXISTS`).
2. **Kiểm tra thời hạn (`isDurationValid`)**:
   - Gói có thời hạn (`isLifetime = false`): bắt buộc truyền `durationDays > 0`.
   - Gói trọn đời (`isLifetime = true`): `durationDays` bắt buộc phải `null`.
3. **Kiểm tra Tag**: Danh sách `tagIds` được lọc trùng tự động; nếu có bất kỳ `tagId` nào không tồn tại sẽ trả về `404 Not Found`.
4. **Trạng thái khởi tạo**: Hệ thống tạo bản ghi `ProductEntity` với `productType = SUBSCRIPTION` và trạng thái mặc định `status = UNPUBLISHED` (chờ kiểm duyệt/mở bán).

#### D. Ví dụ Request
```json
{
  "planName": "Lumintra Pro 30 Ngày",
  "planCode": "PRO_30_DAYS",
  "basePrice": 199000,
  "description": "Mở khóa toàn bộ bộ sưu tập nhân vật Pixel Art trong 30 ngày.",
  "thumbnailUrl": "https://cdn.lumintra.shop/store-products/pro-30d.png",
  "isLifetime": false,
  "durationDays": 30,
  "allAccessCharacters": true,
  "tagIds": [1, 4]
}
```

#### E. Response `201 Created` (`CreatedSubscriptionResponse`)
```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": {
    "subscriptionDetailId": 12,
    "productId": 45,
    "planCode": "PRO_30_DAYS",
    "planName": "Lumintra Pro 30 Ngày",
    "basePrice": 199000,
    "description": "Mở khóa toàn bộ bộ sưu tập nhân vật Pixel Art trong 30 ngày.",
    "thumbnailUrl": "https://cdn.lumintra.shop/store-products/pro-30d.png",
    "isLifetime": false,
    "durationDays": 30,
    "allAccessCharacters": true,
    "status": "UNPUBLISHED",
    "createdAt": "2026-11-17T09:00:00Z",
    "tagIds": [1, 4]
  },
  "meta": null
}
```

---

### 3.2. Lấy danh sách các Gói Hội viên (List Managed Subscriptions)

- **Endpoint**: `GET /api/management/admin/store/subscriptions`
- **HTTP Status thành công**: `200 OK`
- **Controller**: `ManagedSubscriptionController.java`
- **Repository**: `SubscriptionDetailRepository.listManagedPlans()`
- **Phân quyền**: Role `MANAGER`

#### A. Request Headers
| Header | Giá trị | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | Có | JWT Token của tài khoản Manager |

#### B. Response `200 OK` (`List<ManagedSubscriptionResponse>`)
| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `subscriptionDetailId` | `Long` | ID chi tiết gói hội viên (dùng làm `{id}` khi gọi API Update) |
| `productId` | `Long` | ID sản phẩm tương ứng trong bảng `PRODUCT` |
| `planCode` | `String` | Mã định danh gói |
| `planName` | `String` | Tên hiển thị gói |
| `basePrice` | `BigDecimal` | Giá bán hiện tại (VND) |
| `isLifetime` | `boolean` | Có phải gói vĩnh viễn hay không |
| `durationDays` | `Integer` | Số ngày hiệu lực (`null` nếu `isLifetime = true`) |
| `allAccessCharacters` | `boolean` | Quyền mở khóa toàn bộ Character |
| `status` | `ProductStatus` | Trạng thái sản phẩm (`UNPUBLISHED`, `PUBLISHED`, `HIDDEN`, `ARCHIVED`, ...) |
| `createdAt` | `Instant` | Thời điểm tạo (ISO-8601 UTC) |

#### C. Ví dụ Response `200 OK`
```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": [
    {
      "subscriptionDetailId": 12,
      "productId": 45,
      "planCode": "PRO_30_DAYS",
      "planName": "Lumintra Pro 30 Ngày",
      "basePrice": 199000,
      "isLifetime": false,
      "durationDays": 30,
      "allAccessCharacters": true,
      "status": "UNPUBLISHED",
      "createdAt": "2026-11-17T09:00:00Z"
    },
    {
      "subscriptionDetailId": 13,
      "productId": 46,
      "planCode": "LIFETIME_VIP",
      "planName": "Lumintra Lifetime VIP",
      "basePrice": 1990000,
      "isLifetime": true,
      "durationDays": null,
      "allAccessCharacters": true,
      "status": "PUBLISHED",
      "createdAt": "2026-11-17T09:05:00Z"
    }
  ],
  "meta": null
}
```

---

### 3.3. Cập nhật Gói Hội viên (Update Subscription)

- **Endpoint**: `PUT /api/management/admin/store/subscriptions/{id}`
- **HTTP Status thành công**: `200 OK`
- **Controller**: `UpdateSubscriptionController.java`
- **Use Case**: `UpdateSubscriptionUseCase.java`
- **Phân quyền**: Role `MANAGER`

#### A. Path Parameters
| Tham số | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `long` | `@Positive` | `subscriptionDetailId` của gói hội viên cần cập nhật |

#### B. Request Body Schema (`UpdateSubscriptionRequest`)
| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Ràng buộc / Validation | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `planName` | `String` | **Có** | `@NotBlank`, `@Size(max = 255)`, tự động `.strip()` | Tên mới của gói hội viên (đồng bộ cả `productName`) |
| `basePrice` | `BigDecimal` | **Có** | `@NotNull`, `@DecimalMin("0")`, `@Digits(integer = 10, fraction = 2)` | Giá bán mới (VND) |
| `description` | `String` | Không | Văn bản tùy ý | Mô tả mới của gói |
| `thumbnailUrl` | `String` | Không | `@Size(max = 500)`, `@URL`, `@Pattern(regexp = "https?://\\S+")` | URL ảnh đại diện mới |
| `durationDays` | `Integer` | **Có điều kiện** | `@Positive`; phải `null` nếu gói là `isLifetime = true`, phải `> 0` nếu `isLifetime = false` | Số ngày hiệu lực mới |
| `allAccessCharacters` | `Boolean` | **Có** | `@NotNull` | Cập nhật quyền truy cập toàn bộ Character |

> [!NOTE]
> Các trường `planCode`, `isLifetime` và `tagIds` **không thể thay đổi** qua endpoint này. Danh sách `tagIds` hiện có của sản phẩm sẽ được giữ nguyên và trả về trong response.

#### C. Quy tắc nghiệp vụ (Business Rules)
1. **Kiểm tra tồn tại**: Tra cứu `SubscriptionDetailEntity` theo `id` và `ProductEntity` tương ứng phải có `productType == SUBSCRIPTION` và `status != DELETED`. Nếu không thỏa mãn -> `404 Not Found` (`SUBSCRIPTION_NOT_FOUND`).
2. **Bảo toàn loại gói (`lifetime` vs fixed-term)**: Không cho phép biến đổi gói vĩnh viễn thành gói có thời hạn hoặc ngược lại (`detail.isLifetime() != (request.durationDays() == null)`). Nếu vi phạm -> `400 Bad Request` (`INVALID_SUBSCRIPTION_DURATION`).
3. **Đồng bộ dữ liệu & Event**: Cập nhật đồng thời cả `SubscriptionDetailEntity` và `ProductEntity`, sau đó phát sự kiện `StoreProductUpdatedEvent(productId)`.

#### D. Ví dụ Request
```json
{
  "planName": "Lumintra Pro 30 Ngày (Ưu đãi)",
  "basePrice": 179000,
  "description": "Giá mới ưu đãi, mở khóa toàn bộ Character Pixel Art.",
  "thumbnailUrl": "https://cdn.lumintra.shop/store-products/pro-30d-v2.png",
  "durationDays": 30,
  "allAccessCharacters": true
}
```

#### E. Response `200 OK` (`UpdatedSubscriptionResponse`)
```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": {
    "subscriptionDetailId": 12,
    "productId": 45,
    "planCode": "PRO_30_DAYS",
    "planName": "Lumintra Pro 30 Ngày (Ưu đãi)",
    "basePrice": 179000,
    "description": "Giá mới ưu đãi, mở khóa toàn bộ Character Pixel Art.",
    "thumbnailUrl": "https://cdn.lumintra.shop/store-products/pro-30d-v2.png",
    "isLifetime": false,
    "durationDays": 30,
    "allAccessCharacters": true,
    "status": "UNPUBLISHED",
    "createdAt": "2026-11-17T09:00:00Z",
    "tagIds": [1, 4]
  },
  "meta": null
}
```

---

## 4. Bảng mã lỗi thường gặp (Error Responses)

| HTTP Status | Error Code | Tình huống xảy ra |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Thiếu trường bắt buộc, `basePrice < 0`, `thumbnailUrl` không phải HTTP/HTTPS URL, hoặc `isDurationValid` thất bại khi tạo mới |
| `400 Bad Request` | `INVALID_SUBSCRIPTION_DURATION` | Khi cập nhật: truyền `durationDays` cho gói `isLifetime = true`, hoặc bỏ trống `durationDays` cho gói `isLifetime = false` |
| `401 Unauthorized` | `UNAUTHORIZED` | Thiếu hoặc sai JWT Token |
| `403 Forbidden` | `FORBIDDEN` | Tài khoản không có Role `MANAGER` |
| `404 Not Found` | `SUBSCRIPTION_NOT_FOUND` | Không tìm thấy gói hội viên theo `id`, hoặc sản phẩm tương ứng đã bị xóa (`DELETED`) |
| `404 Not Found` | `STORE_PRODUCT_TAG_NOT_FOUND` | Một hoặc nhiều `tagIds` khi tạo mới không tồn tại trong hệ thống |
| `409 Conflict` | `PLAN_CODE_ALREADY_EXISTS` | `planCode` đã tồn tại khi tạo gói hội viên mới |

---

## 5. Lưu ý về vòng đời trạng thái (Publish / Ẩn gói)

- Gói hội viên sau khi tạo mới luôn mang trạng thái `UNPUBLISHED`.
- Để **Công khai (`PUBLISHED`)** hoặc **Ẩn (`HIDDEN`)** gói hội viên trên Store, sử dụng API quản lý trạng thái sản phẩm chung của Store (`PATCH /api/management/admin/store/products/{productId}/status`) với `productId` tương ứng.

