# Project Decisions

## D-001 — Wallet removed

Wallet is not part of the current system. Payment uses VNPay.

## D-002 — LED device model

The physical LED is represented by `LED_INSTANCE`.
`LED_INSTANCE` is directly associated with `USER` for ownership.

Authentication proves the user's identity. Device ownership determines which LED the user can control.

## D-003 — Warranty scope

Warranty is intentionally lightweight. The database records warranty information associated with an order and physical LED instance. No physical repair-center workflow is modeled.

## D-004 — Device return

Returned physical devices are recorded in `DEVICE_RETURN`.
The table represents return records, not a second copy of the physical device entity.

## D-005 — General Chatbox

Chatbox is a general communication system using `CONVERSATION`, `CONVERSATION_PARTICIPANT`, and `MESSAGE`.

`MESSAGE` belongs to a conversation. It is not directly attached to a Commission Submission.

## D-006 — Commission creation

A Commission is created directly by the Customer through the Commission feature/form.
A Conversation does not create a Commission.
Chatbox is only used for additional communication when needed.

## D-007 — Commission pricing

Commission pricing uses configurable criteria and options:

- `COMMISSION_PRICE_CONFIG`
- `COMMISSION_PRICE_OPTION`
- `COMMISSION_CONFIG_SELECTION`

The final price is stored in `COMMISSION.price`.

## D-008 — Submission and pricing are separate

`COMMISSION_SUBMISSION` stores Designer output and review information.
Pricing is associated with `COMMISSION`, not with individual submissions.

## D-009 — Current implementation priority

Flow 1 — Customer commerce and Staff order handling — is the first implementation target.
