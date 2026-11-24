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

## Accepted Commission artwork

The gallery also reads the customer's completed commissions through the existing
`GET /api/commissions/my?status=COMPLETED` endpoint, following all pages. It reads
their details in batches of at most six concurrent requests using
`GET /api/commissions/{id}` and includes only the preview matching
`approvedSubmissionId` with status `CUSTOMER_ACCEPTED`. Drafts, reference images,
and staff-approved previews still waiting for customer acceptance are excluded.

The accepted submission is already persisted by the backend. The gallery reads
that durable source, including older completed requests, without creating local
ownership records or new endpoints. Detail reads provide fresh signed URLs for
private Commission media on each refresh. A failed detail request surfaces the
gallery error state rather than silently omitting the accepted artwork.

Commission cards show their source, request link, total cost, completion date,
and image preview. They do not link to a nonexistent Store product/order. An
accepted uploaded image is not a CharacterVersion; displaying it does not grant
Store or device entitlements. Nullable purchase references on granted characters
are retained as null, instead of being converted into links to ID zero.

Successful customer acceptance emits the existing entitlement-change event only
after the backend confirms `COMPLETED`, refreshing the shared gallery. Returning
to the gallery or browser tab also picks up server-side completion.

Run all gallery regression checks with:

```sh
node --test scripts/tests/gallery-artwork.test.cjs scripts/tests/gallery-refresh.test.cjs
```

These checks cover accepted-final selection, pagination, private-media renewal,
null purchase references, failure reporting, and post-accept refresh. A live
accept-and-gallery check was not performed for this extension because the local
backend on port 8080 was unavailable during verification.
