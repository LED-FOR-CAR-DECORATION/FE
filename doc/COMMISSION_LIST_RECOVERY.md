# Commission list recovery

`GET /api/commissions/my?page=0&size=20` returns `{ data: [...], meta: ... }`.
The customer list continues to use this existing API and cancels requests when
the page changes or the component unmounts.

If loading fails, the page shows an accessible error, the backend trace ID when
available, and a **Thử lại** button. Retrying starts a fresh request for the same
page and returns to the loading state. It does not substitute an empty list for
an API failure.

## Legacy backend data

A successful OPTIONS preflight does not imply that the subsequent GET succeeded.
On 2026-11-22, the GET returned HTTP 500 because persisted commission rows still
contained the removed `CUSTOMER_REVISION_REQUESTED` enum value.

The backend fix upgrades these rows at startup before data seeders run:

- Rows with a `CONFIRMED` revision enter `AWAITING_ESTIMATE` with a fresh 24-hour
  estimate window.
- Rows without a confirmed revision resume `IN_PROGRESS`, retaining the existing
  deadline. This avoids requiring an estimate for a revision record that does
  not exist.

Only the legacy status is targeted. Prices, payment history, assignments, and
revision records are retained. Repeated startup does not reset migrated deadlines.
Deploy the backend fix alongside this FE recovery UI to resolve the underlying
500 response.
