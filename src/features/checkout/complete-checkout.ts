import type { Address } from "../address/types";
import type { AuthUser } from "../auth/types";
import type { CartItem } from "../cart/types";
import type { MockOrder } from "../order/types";

type PhysicalOrderInput = { customer: AuthUser; items: CartItem[]; address: Address; shipping: number; paymentMethod: string };
type CheckoutInput = { customer: AuthUser; items: CartItem[]; address?: Address; shipping: number; paymentMethod: string; paymentSucceeded: boolean };
type CheckoutActions = {
  createOrder: (input: PhysicalOrderInput) => MockOrder;
  grantCharacters: (userId: string, paymentId: string, characterIds: string[]) => unknown;
};

export function completeCheckout(input: CheckoutInput, actions: CheckoutActions) {
  const physicalItems = input.items.filter(item => item.productType === "LED_MODEL");
  const characters = input.items.filter(item => item.productType === "CHARACTER");
  if (!input.items.length) throw new Error("Không có sản phẩm để thanh toán.");
  if (characters.length && !input.paymentSucceeded) throw new Error("Character cần được thanh toán trực tuyến trước khi thêm vào Gallery.");
  if (physicalItems.length && !input.address) throw new Error("Vui lòng chọn địa chỉ giao thiết bị LED.");

  const order = physicalItems.length ? actions.createOrder({
    customer: input.customer, items: physicalItems, address: input.address!,
    shipping: input.shipping, paymentMethod: input.paymentMethod,
  }) : null;
  if (characters.length) {
    actions.grantCharacters(input.customer.userId, `PAY-${crypto.randomUUID()}`, characters.map(item => item.id));
  }
  return { order, hasCharacters: characters.length > 0 };
}
