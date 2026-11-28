"use client";

/**
 * Dữ liệu đơn hàng qua TanStack Query (không còn Provider).
 *
 * - Danh sách: chỉ tải summary, cache dùng chung giữa các trang (staleTime 30s).
 * - Chi tiết: mỗi đơn một query riêng theo id, chỉ tải khi trang cần (`details`), đơn đã kết thúc
 *   (COMPLETED/CANCELED/REFUNDED) cache suốt phiên. Trước đây mỗi lần vào layout staff/manager/profile
 *   là tải lại toàn bộ đơn + chi tiết từng đơn.
 * - Thao tác (đổi trạng thái, giao hàng, huỷ…) chỉ làm mới đúng đơn đó + danh sách.
 */

import { useCallback, useMemo } from "react";
import { useQueries, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { CancelOrderResponse, OrderDetailResponse, OrderSummaryItem } from "@/api_client";
import type { Address } from "@/features/address/types";
import type { AuthUser } from "@/features/auth/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CartItem } from "@/features/cart/types";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import {
  mapBackendPaymentStatus,
  mapOrderSummaryAndDetailToOrder,
  mapStaffOrderSummaryAndDetailToOrder,
  ORDERS_CHANGED_EVENT,
  orderService,
  type OrdersChangedDetail,
} from "@/features/order/services/order.service";
import {
  fetchOrderDetail,
  fetchStaffOrderDetail,
  type BackendStaffOrderDetail,
  type BackendStaffOrderSummary,
  type DispatchOrderRequest,
  type DispatchOrderResponse,
  type UpdateStaffDeliveryAddressRequest,
} from "@/lib/api/orders";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { createLimiter } from "@/lib/query/limit";

const runDetail = createLimiter(6);
const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELED", "REFUNDED"]);
const AMBIGUOUS_STATUSES = new Set(["PENDING_PAYMENT", "PROCESSING", "PARTIALLY_FULFILLED"]);

function detailStaleTime(status?: string): number {
  return TERMINAL_STATUSES.has(status ?? "") ? Infinity : 30_000;
}

type Role = "CUSTOMER" | "STAFF" | null;

function resolveRole(user: AuthUser | null): Role {
  if (!user) return null;
  if (user.role === "CUSTOMER") return "CUSTOMER";
  if (user.role === "STAFF" || user.role === "MANAGER" || user.role === "ADMIN") return "STAFF";
  return null;
}

/**
 * Trang staff cần chi tiết cho những đơn nào (ngoài các đơn có trạng thái chỉ xác định được khi có chi tiết):
 * - "delivery": đơn có vận chuyển (địa chỉ, ngày dự kiến…)
 * - "character": đơn có thể chứa nhân vật (danh sách item, doanh thu)
 */
export type StaffDetailNeed = "delivery" | "character";

function staffNeedsDetail(summary: BackendStaffOrderSummary, needs: readonly StaffDetailNeed[]): boolean {
  // Bundle/Mixed đã thanh toán và chưa kết thúc: trạng thái hiển thị phụ thuộc vào item thật (có LED hay không).
  const isPaid = mapBackendPaymentStatus(summary.status, summary.paymentStatus) === "Paid";
  if ((summary.orderType === "BUNDLE" || summary.orderType === "MIXED") && isPaid && AMBIGUOUS_STATUSES.has(summary.status)) {
    return true;
  }
  if (needs.includes("delivery") && summary.deliveryStatus) return true;
  if (needs.includes("character") && summary.orderType !== "PHYSICAL") return true;
  return false;
}

function staffDetailQuery(orderId: number | string, status?: string) {
  return {
    queryKey: queryKeys.orders.staffDetail(orderId),
    queryFn: () => runDetail(() => fetchStaffOrderDetail(orderId)),
    staleTime: detailStaleTime(status),
  };
}

function customerDetailQuery(orderId: number | string, status?: string) {
  return {
    queryKey: queryKeys.orders.customerDetail(orderId),
    queryFn: () => runDetail(() => fetchOrderDetail(orderId)),
    staleTime: detailStaleTime(status),
  };
}

// Đơn của khách đổi (thanh toán xong, huỷ, xác nhận nhận hàng…): làm mới danh sách + đúng đơn đó.
const bridgeScope = globalThis as typeof globalThis & { __ledOrdersBridge?: boolean };
if (typeof window !== "undefined" && !bridgeScope.__ledOrdersBridge) {
  bridgeScope.__ledOrdersBridge = true;
  window.addEventListener(ORDERS_CHANGED_EVENT, (event) => {
    const orderId = (event as CustomEvent<OrdersChangedDetail | undefined>).detail?.orderId;
    void invalidateOrder(getQueryClient(), "CUSTOMER", orderId);
  });
}

function invalidateOrder(queryClient: QueryClient, role: Role, orderId?: string | number): Promise<unknown> {
  if (role === "CUSTOMER") {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.customer(), exact: true }),
      orderId !== undefined
        ? queryClient.invalidateQueries({ queryKey: queryKeys.orders.customerDetail(orderId) })
        : queryClient.invalidateQueries({ queryKey: ["orders", "customer", "detail"] }),
    ]);
  }
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.staff(), exact: true }),
    orderId !== undefined
      ? queryClient.invalidateQueries({ queryKey: queryKeys.orders.staffDetail(orderId) })
      : queryClient.invalidateQueries({ queryKey: ["orders", "staff", "detail"] }),
  ]);
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Không tải được danh sách đơn hàng.";
}

export interface UseOrdersOptions {
  /** Chỉ áp dụng cho staff; khách luôn cần chi tiết để hiện danh sách sản phẩm. */
  details?: readonly StaffDetailNeed[];
}

const NO_DETAILS: readonly StaffDetailNeed[] = [];
const NO_CUSTOMER_SUMMARIES: OrderSummaryItem[] = [];
const NO_STAFF_SUMMARIES: BackendStaffOrderSummary[] = [];

/** Gộp kết quả useQueries thành giá trị ổn định (TanStack memo theo cấu trúc) để `orders` không đổi tham chiếu mỗi render. */
function combineDetails<T>(results: Array<{ data?: T | null; isPending: boolean }>) {
  return {
    data: results.map((result) => result.data ?? null),
    isPending: results.some((result) => result.isPending),
  };
}

/** Danh sách đơn của người dùng hiện tại (khách: đơn của tôi; staff/manager/admin: toàn bộ đơn). */
export function useOrders(options: UseOrdersOptions = {}) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const role = isAuthenticated ? resolveRole(user) : null;
  const needs = options.details ?? NO_DETAILS;

  const customerList = useQuery({
    queryKey: queryKeys.orders.customer(),
    queryFn: () => orderService.fetchCustomerOrderSummaries(),
    enabled: !authLoading && role === "CUSTOMER",
  });
  const staffList = useQuery({
    queryKey: queryKeys.orders.staff(),
    queryFn: () => orderService.fetchStaffOrderSummaries(),
    enabled: !authLoading && role === "STAFF",
  });

  const customerSummaries = role === "CUSTOMER" ? customerList.data ?? NO_CUSTOMER_SUMMARIES : NO_CUSTOMER_SUMMARIES;
  const staffSummaries = role === "STAFF" ? staffList.data ?? NO_STAFF_SUMMARIES : NO_STAFF_SUMMARIES;
  const staffDetailTargets = useMemo(
    () => staffSummaries.filter((summary) => staffNeedsDetail(summary, needs)),
    [staffSummaries, needs],
  );

  const customerDetails = useQueries({
    queries: customerSummaries.map((summary) => customerDetailQuery(summary.orderId, summary.status)),
    combine: combineDetails<OrderDetailResponse>,
  });
  const staffDetails = useQueries({
    queries: staffDetailTargets.map((summary) => staffDetailQuery(summary.orderId, summary.status)),
    combine: combineDetails<BackendStaffOrderDetail>,
  });

  const orders = useMemo<MockOrder[]>(() => {
    if (role === "CUSTOMER") {
      return customerSummaries.map((summary, index) =>
        mapOrderSummaryAndDetailToOrder(summary, customerDetails.data[index] ?? null, user),
      );
    }
    if (role === "STAFF") {
      const detailById = new Map<number, BackendStaffOrderDetail | null>();
      staffDetailTargets.forEach((summary, index) => {
        detailById.set(summary.orderId, staffDetails.data[index] ?? null);
      });
      return staffSummaries.map((summary) =>
        mapStaffOrderSummaryAndDetailToOrder(summary, detailById.get(summary.orderId) ?? null),
      );
    }
    return [];
  }, [role, user, customerSummaries, customerDetails, staffSummaries, staffDetailTargets, staffDetails]);

  const list = role === "CUSTOMER" ? customerList : staffList;
  const details = role === "CUSTOMER" ? customerDetails : staffDetails;
  const isLoading = authLoading || (role !== null && (list.isPending || details.isPending));

  const actions = useOrderActions();
  const queryClient = useQueryClient();
  const refreshOrders = useCallback(async () => {
    if (!role) return;
    await invalidateOrder(queryClient, role);
  }, [queryClient, role]);

  return {
    orders,
    isLoading,
    /** Lỗi của lần tải gần nhất; danh sách cũ được giữ nguyên khi lỗi. */
    error: errorMessage(list.error),
    refreshOrders,
    ...actions,
  };
}

/** Thao tác trên đơn, không tải danh sách (vd. trang checkout chỉ cần tạo đơn). */
export function useOrderActions() {
  const { user } = useAuth();
  const role = resolveRole(user);
  const queryClient = useQueryClient();

  const createOrder = useCallback(
    async (input: { customer: AuthUser; items: CartItem[]; address: Address; shipping: number; paymentMethod: string }) => {
      // checkout() tự phát ORDERS_CHANGED → cache đơn của khách được làm mới qua bridge.
      const result = await orderService.checkout({ customer: input.customer, items: input.items, address: input.address });
      return { id: result.orderId, paymentCode: result.paymentCode };
    },
    [],
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus, reason?: string) => {
      if (role !== "STAFF") return;
      const targetBackendStatus =
        status === "Cancelled" || status === "CANCELED"
          ? "CANCELED"
          : status === "Confirmed" || status === "PROCESSING" || status === "Preparing"
            ? "PROCESSING"
            : status === "REFUNDED"
              ? "REFUNDED"
              : status === "Delivered" || status === "COMPLETED"
                ? "COMPLETED"
                : undefined;
      if (!targetBackendStatus) return;
      await orderService.updateStaffStatus(id, targetBackendStatus, reason);
      await invalidateOrder(queryClient, "STAFF", id);
    },
    [role, queryClient],
  );

  const updateOrderDeliveryAddress = useCallback(
    async (id: string, payload: UpdateStaffDeliveryAddressRequest) => {
      await orderService.updateStaffDeliveryAddress(id, payload);
      await invalidateOrder(queryClient, "STAFF", id);
    },
    [queryClient],
  );

  const createDelivery = useCallback(
    async (id: string) => {
      await invalidateOrder(queryClient, "STAFF", id);
    },
    [queryClient],
  );

  const dispatchOrder = useCallback(
    async (id: string, payload: DispatchOrderRequest): Promise<DispatchOrderResponse> => {
      const res = await orderService.dispatchOrderToAhamove(id, payload);
      await invalidateOrder(queryClient, "STAFF", id);
      return res;
    },
    [queryClient],
  );

  // confirmDelivery()/cancelCustomerOrder() tự phát ORDERS_CHANGED kèm orderId → bridge làm mới đúng đơn đó.
  const confirmOrderDelivery = useCallback(async (orderId: string | number) => {
    await orderService.confirmDelivery(orderId);
  }, []);

  const cancelCustomerOrder = useCallback(
    async (orderId: string | number, reason?: string): Promise<CancelOrderResponse> =>
      orderService.cancelCustomerOrder(orderId, reason),
    [],
  );

  return {
    createOrder,
    updateOrderStatus,
    updateOrderDeliveryAddress,
    createDelivery,
    dispatchOrder,
    confirmOrderDelivery,
    cancelCustomerOrder,
  };
}

function staffSummaryFromDetail(detail: BackendStaffOrderDetail): BackendStaffOrderSummary {
  return {
    orderId: detail.orderId,
    orderType: detail.orderType,
    status: detail.status,
    paymentStatus: detail.payment?.status,
    deliveryStatus: detail.delivery?.deliveryStatus,
    customerId: detail.customer?.customerId,
    customerFullName: detail.customer?.fullName,
    customerEmail: detail.customer?.email,
    recipientName: detail.delivery?.recipientName,
    recipientPhone: detail.delivery?.recipientPhone,
    totalAmount: detail.totalAmount,
    totalItems: detail.items?.length ?? 0,
    primaryProductName: detail.items?.[0]?.productName ?? "",
    primaryProductThumbnail: detail.items?.[0]?.thumbnailUrl,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

function customerSummaryFromDetail(detail: OrderDetailResponse): OrderSummaryItem {
  return {
    orderId: detail.orderId,
    orderType: detail.orderType as unknown as OrderSummaryItem["orderType"],
    status: detail.status as unknown as OrderSummaryItem["status"],
    totalAmount: detail.totalAmount,
    totalItems: detail.items?.length ?? 0,
    primaryProductName: detail.items?.[0]?.productName ?? "",
    primaryProductThumbnail: detail.items?.[0]?.thumbnailUrl ?? null,
    expiresAt: detail.expiresAt ?? null,
    createdAt: detail.createdAt,
  };
}

/**
 * Một đơn theo id: gọi thẳng API chi tiết thay vì tải cả danh sách rồi `find`.
 * Dùng cho trang chi tiết đơn của staff/manager và của khách.
 */
export function useOrder(orderId: string | number | undefined) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const role = isAuthenticated ? resolveRole(user) : null;
  const queryClient = useQueryClient();
  const validId = orderId !== undefined && Number(orderId) > 0;

  const staffQuery = useQuery({
    ...staffDetailQuery(orderId ?? 0),
    staleTime: 30_000,
    enabled: !authLoading && role === "STAFF" && validId,
  });
  const customerQuery = useQuery({
    ...customerDetailQuery(orderId ?? 0),
    staleTime: 30_000,
    enabled: !authLoading && role === "CUSTOMER" && validId,
  });

  const order = useMemo<MockOrder | undefined>(() => {
    if (role === "STAFF" && staffQuery.data) {
      return mapStaffOrderSummaryAndDetailToOrder(staffSummaryFromDetail(staffQuery.data), staffQuery.data);
    }
    if (role === "CUSTOMER" && customerQuery.data) {
      return mapOrderSummaryAndDetailToOrder(customerSummaryFromDetail(customerQuery.data), customerQuery.data, user);
    }
    return undefined;
  }, [role, user, staffQuery.data, customerQuery.data]);

  const query = role === "CUSTOMER" ? customerQuery : staffQuery;
  const actions = useOrderActions();
  const refreshOrder = useCallback(async () => {
    if (!role || !validId) return;
    await invalidateOrder(queryClient, role, orderId);
  }, [queryClient, role, validId, orderId]);

  return {
    order,
    /** Chi tiết thô của staff (items có orderItemId, delivery, payment…) cho trang xử lý đơn. */
    staffDetail: role === "STAFF" ? staffQuery.data ?? null : null,
    isLoading: authLoading || (validId && role !== null && query.isPending),
    error: errorMessage(query.error),
    refreshOrder,
    ...actions,
  };
}
