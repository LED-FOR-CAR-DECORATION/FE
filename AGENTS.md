<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Backend integration conventions

The supplied `../contributing.pdf` describes backend engineering rules. The detailed, existing project guide is `../backend/README.md`; read it when adding or changing backend integration. Do not impose Java/Spring layer folders on this frontend.

- Successful API bodies contain top-level `data`; pagination is a documented DTO inside `data`. Optional metadata is endpoint-specific. A `204` response has no body.
- Errors use `{ code, message, status, timestamp, traceId, details }`, with an array for details and ISO-8601 UTC timestamps. Preserve codes/validation details/trace IDs; never mask infrastructure failures as empty business results.
- Keep transport types and provider-specific mapping in service adapters. Use plural lowercase resource paths without trailing slashes.
- Backend authentication, authorization, ownership checks, payment verification, and persistence remain authoritative. Frontend guards and local mock state are presentation/prototype behavior.
- Never put provider secrets or privileged database/payment operations in client code. Do not log credentials, full requests, payment data, or sensitive personal records.
- Require confirmed payment before granting Character ownership; production grants must be enforced by the backend. Use backend-supported idempotency for retried side effects.
- Apply the more detailed adapter guidance in `.cursor/rules/backend-api-contract.mdc`. These additions document integration conventions; they do not assert that the current mock frontend already implements production backend guarantees.
