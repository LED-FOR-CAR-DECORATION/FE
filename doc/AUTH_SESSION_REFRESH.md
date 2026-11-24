# Access-token refresh

The existing backend contract is `POST /api/auth/refresh` with a JSON body
`{ refreshToken }`. The response envelope contains a new `accessToken`, a rotated
single-use `refreshToken`, and `expiresIn` in seconds. No backend API is added.

## Frontend behavior

- `getSessionToken()` refreshes when the access cookie is missing or the JWT
  expires within 30 seconds, provided a refresh token is stored. All existing
  generated API calls, Axios helpers, and WebSocket token reads share this path.
- Auth endpoints read the access cookie without invoking proactive refresh.
  The refresh transport calls Axios directly, bypassing `OpenAPI.TOKEN`, so
  obtaining a token cannot recursively wait for itself.
- Concurrent refreshes in the same tab share one promise. Both returned tokens
  are stored before waiting requests continue. A delayed 401 reuses a token
  that another request already renewed.
- Backend API requests rejected with 401 retry at most once. Authentication
  endpoint failures and third-party requests do not trigger this retry policy.
- A refresh rejection (401/403) clears the local session and notifies
  `AuthProvider`. Network errors and 5xx responses preserve the stored session
  and propagate the failure so a subsequent request can try again.
- Session hydration refreshes before loading the profile. Version guards prevent
  delayed profile or refresh responses from restoring a logged-out session or
  overwriting a new login. Logout cleanup also avoids deleting a newer login's
  refresh token.
- Chat reconnects stop when refresh is rejected and retain the existing bounded
  retry behavior during temporary refresh failures.

Renewal is request-driven; it does not run a permanent background timer while
the application is idle. Single-flight coordination is per tab. The storage
check also discards an in-flight refresh result if the stored refresh token has
changed in the meantime.

## Verification

```sh
node --test scripts/tests/session-refresh.test.cjs
npx tsc --noEmit
```

The tests use fabricated tokens and an Axios adapter; no credentials are printed.
They cover missing/near-expiry access tokens, concurrent and delayed 401s, token
rotation, invalid refresh, temporary failures, changed sessions, retry limits,
excluded endpoints, and React state after an expired session. Live verification
against port 8080 was unavailable because the local backend was not running.
