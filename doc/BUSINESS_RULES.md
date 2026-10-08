# Business Rules

## Authentication

- USER is the central identity entity.
- Authentication and authorization are separate concerns.
- Access control uses roles and permissions.
- Roles currently include Customer, Designer, Staff, Manager, and Admin.

## Customer purchase flow

The approved Flow 1 is:

1. Customer registers or logs in.
2. Customer views the product list.
3. Customer views product details.
4. Customer adds products to cart.
5. Customer views and edits the cart.
6. Customer checks out.
7. Customer confirms the order.
8. The system creates the order.
9. Customer completes payment through VNPay.
10. Staff reviews the order.
11. Staff confirms the order.
12. Staff creates the shipping order.
13. Customer views order details and shipping status.

Order creation and order confirmation are different business events.

## Cart and order

- Cart belongs to a Customer.
- Order records the final purchase.
- Order items preserve the purchase-time unit price and subtotal.
- Order stores a shipping-address snapshot so historical order information is not changed by later address edits.

## Payment

- Wallet functionality is not part of the current design.
- VNPay is the payment service for purchases and commissions.

## Shipping

- Staff creates the shipping order as part of the current Flow 1.
- Current project design does not require a full warehouse/shipping management system.
- Shipping information is recorded in DELIVERY.

## Profile

Customer profile contains:

- Personal/account information.
- Saved shipping addresses.
- Order history.

## Commission

- Customer creates a Commission request directly from the Commission feature/form.
- Conversation does not create a Commission.
- Chatbox is a general communication feature used to exchange additional information.
- Commission pricing is configured through predefined configuration items and options.
- Customer selections are stored for the Commission.
- Commission stores the final price.
- Commission Submission stores the designer's submitted result and review information; it is not responsible for pricing.

## Commission pricing

The current pricing configuration model uses:

- `COMMISSION_PRICE_CONFIG` — defines a configurable criterion such as Resolution, Size, or FPS.
- `COMMISSION_PRICE_OPTION` — defines an option under a criterion and its additional price.
- `COMMISSION_CONFIG_SELECTION` — records the option selected for a specific Commission.
- `COMMISSION.price` — final price of the Commission.

The selected option's price should be snapshotted for the Commission so historical pricing does not change when configuration values are edited later.

## Warranty

Warranty is intentionally lightweight.

- Warranty is recorded in the database.
- It is associated with the order and the physical LED instance.
- The project does not model a full physical repair-center workflow.

## Device return

- Returned physical devices are recorded in `DEVICE_RETURN`.
- The project does not model a complete physical repair/refurbishment center.

## Firmware

Firmware is represented as a version/update history for LED devices. Do not expand this into a complete device-management platform unless explicitly requested.

## Scope discipline

Do not add business entities or workflows simply because they are common in real-world e-commerce systems. Add them only when required by the approved project scope.
