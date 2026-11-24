# Purchased character gallery synchronization

The backend grants character ownership when the order's payment succeeds. The
frontend reads the existing `GET /api/customer/characters/owned` endpoint; it
does not grant ownership based on a client-side payment flag.

The shared gallery provider now refreshes after `ORDERS_CHANGED_EVENT`, which
the SePay payment component already emits when it receives `SUCCEEDED` from
the payment API. It also refreshes when the document becomes visible or the
browser window regains focus, supporting payments completed in another tab.
Opening `/profile/gallery` explicitly refreshes the library because the root
provider persists across client-side navigation.

Every refresh invalidates older requests, including refreshes caused by logout
or account changes. Responses from the previous customer cannot repopulate the
library after logout. Existing error handling and the manual refresh remain.

## Verification

- `npx tsc --noEmit`
- `node --test scripts/tests/gallery-refresh.test.cjs`
- Locally confirmed that the owned-character API already returned the recently
  purchased character for order 43. This incident required no backend endpoint
  or ownership-data changes.

The regression tests exercise payment-event refresh, out-of-order responses,
logout during an active request, and hidden/visible tab behavior. They do not
execute a real bank transfer or verify the signed-in page in a browser.
