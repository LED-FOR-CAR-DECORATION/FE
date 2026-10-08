# Project Context

## Project

LED Windshield Projection System with Characters

## Current frontend technology

- Next.js
- TypeScript
- Next.js App Router

The exact versions and additional libraries are defined by the repository's package configuration and should not be guessed.

## User roles

- Guest — unauthenticated visitor who can browse and can perform first-time purchase flow.
- Customer — registered end user who purchases products, manages profile and orders, uses LED devices, and submits commissions.
- Designer — creates Characters and versions, publishes selected versions, and works on assigned commissions.
- Staff — customer-facing operational role. Staff supports customers, reviews commissions, manages customer/order support, and can create shipping orders.
- Manager — manages LED inventory, Store Listing pricing, customer orders, and related fulfillment operations.
- Admin — system governance, role/permission management, and reporting.

## Current implementation focus

The immediate implementation focus is Flow 1: commerce and order management.

Customer scope for Flow 1:

- Register / Login
- View product list
- View product details
- Add and manage cart items
- Checkout
- View profile
- Manage personal information
- Manage shipping addresses
- View order history
- View order details and status

Staff scope for Flow 1:

- Login
- View order list
- View order details
- Confirm orders
- Create shipping orders

Other modules such as Commission, Chatbox, Warranty, Device Return, and Firmware are part of the broader system but should not be mixed into Flow 1 implementation unless the task explicitly requires them.

## External services currently established by the project

- VNPay — payment processing.
- ViettelPost — shipping workflow currently represented as a shipping-order creation flow. Do not assume direct API integration unless explicitly implemented.
- Google Maps — address/location support where required by the project.

## Development principle

The frontend should implement approved business flows rather than inventing new business rules.
