# AI Coding Agent Rules

You are working on an existing Next.js + TypeScript project.

## Golden Principle: Backend is Immutable, Frontend is Mutable (BE là bất biến, FE là khả biến)

- **Backend Immutability (BE là bất biến)**:
  - Mã nguồn Backend (`BE/backend`), cấu trúc database, các endpoint API, JPA Entities, Enums, DTOs, và Use Cases được coi là **BẤT BIẾN (IMMUTABLE)**.
  - Tuyệt đối không tự ý sửa đổi code Backend, controllers, database schema, hoặc use cases chỉ để phục vụ cho sự tiện lợi của Frontend hoặc để khớp với giả định của Frontend.
- **Frontend Adaptation (FE là khả biến)**:
  - Frontend là bên **KHẢ BIẾN (MUTABLE)**. Khi gặp lỗi tích hợp, thiếu trường, lệch trạng thái enum, hoặc logic hiển thị, **luôn ưu tiên 100% sửa bên Frontend**.
  - Frontend phải chủ động tạo mappers, adapters, transformers và xử lý dữ liệu sao cho khớp chính xác với dữ liệu thực tế và contract của Backend.
  - Dữ liệu trả về từ Backend API và database PostgreSQL luôn là **Single Source of Truth**.

## Before changing code

1. Inspect the repository structure.
2. Read the relevant files in `/docs`.
3. Inspect existing implementations before creating duplicates.
4. Identify whether the requested work affects routing, components, services, types, authentication, or API integration.
5. Keep the change limited to the requested scope.

## Source of truth

Use:

- `BUSINESS_RULES.md` for business rules.
- `USER_FLOWS.md` for approved user flows.
- `ERD.md` for the database model.
- `FRONTEND_ARCHITECTURE.md` for frontend conventions.

Do not invent business behavior that is not specified.

## When requirements are ambiguous

Do not silently choose a major business rule.
Explain the ambiguity and propose the smallest reasonable option.

## Coding behavior

- Reuse existing components and utilities where appropriate.
- Do not duplicate API clients or types unnecessarily.
- Do not move files without a reason.
- Do not perform broad refactors during a focused feature task.
- Keep components reasonably small and focused.
- Preserve existing naming conventions if the repository already has them.
- Prefer type-safe code.
- Handle loading, empty, error, and success states where relevant.

## Database discipline

The AI agent should not change the ERD or invent database fields merely to make a frontend implementation easier.
If the backend contract is missing a required field, report it instead of silently changing the data model.

## UI discipline

Do not introduce arbitrary business rules into UI components.
Do not hard-code configurable business data such as Commission pricing options when those values are expected to come from the backend.

## Verification

After implementation:

1. Run the relevant lint/typecheck/test commands if available.
2. Report any errors.
3. Summarize changed files.
4. Mention any assumptions or unresolved backend dependencies.
