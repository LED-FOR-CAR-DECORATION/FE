/**
 * Query key tập trung: invalidate theo tiền tố (vd. `queryKeys.orders.all`) sẽ làm mới mọi query con.
 * Thêm key mới ở đây thay vì viết mảng rời rạc trong component.
 */
export const queryKeys = {
  me: ["me"] as const,
  orders: {
    all: ["orders"] as const,
    customer: () => ["orders", "customer"] as const,
    staff: () => ["orders", "staff"] as const,
    customerDetail: (orderId: string | number) => ["orders", "customer", "detail", String(orderId)] as const,
    staffDetail: (orderId: string | number) => ["orders", "staff", "detail", String(orderId)] as const,
  },
  gallery: {
    all: ["gallery"] as const,
    owned: (userId: string) => ["gallery", "owned", userId] as const,
    subscriptions: (userId: string) => ["gallery", "subscriptions", userId] as const,
  },
  store: {
    all: ["store"] as const,
    products: () => ["store", "products"] as const,
    productDetail: (productId: string | number) => ["store", "product", String(productId)] as const,
    tags: () => ["store", "tags"] as const,
  },
  commissions: {
    all: ["commissions"] as const,
    detail: (commissionId: number) => ["commissions", "detail", commissionId] as const,
    customerDetail: (commissionId: number) => ["commissions", "customer-detail", commissionId] as const,
    messages: (commissionId: number) => ["commissions", "messages", commissionId] as const,
  },
} as const;
