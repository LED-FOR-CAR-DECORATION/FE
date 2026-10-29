This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Backend login

Copy `.env.example` to `.env.local` and set `BACKEND_URL` to the Spring Boot server origin (default `http://localhost:8080`). Restart Next.js after changing it. Start the backend and run `npm run dev` here.

Axios sends `POST /api/auth/login` with `{ email, password }` through the Next.js proxy and reads the `{ data }` envelope. Use a real account in the backend database. JWT roles drive UI navigation only; the backend enforces authorization. The login response has no profile, so email is used as the initial display name.

The access token and cached profile live in sessionStorage for the current tab. Axios attaches Bearer authorization to subsequent API requests; expiry or a protected request returning 401 clears the session. The current frontend clears the local session on logout and does not yet retain/use refresh tokens. The backend now provides Google login, refresh rotation and logout-all-devices endpoints; see `../backend/docs/auth-api.md` for integration. Until the frontend adopts those endpoints, sign in again after expiry. Password recovery remains a mock feature.

Registration calls `POST /api/auth/register` with `{ fullName, email, password, confirmPassword }` and creates a Customer account and profile. After success, use the login link to sign in. Validation runs in both the form and backend: name 2–100 characters, valid email up to 254 characters, password 8–72 characters and at most 72 UTF-8 bytes, with uppercase/lowercase letters, a digit and a special character, no whitespace, plus matching confirmation. Duplicate emails return 409; field validation returns 400 with `details`. `npm run test:auth` checks validation boundaries and the Axios registration contract.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
