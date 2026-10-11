import type { AuthUser } from "./types";

export const DEMO_ACCOUNTS = [
  {
    email: "customer123@gmail.com",
    password: "Customer123@",
    user: {
      userId: "mock-customer-001",
      email: "customer123@gmail.com",
      fullName: "Customer 123",
      role: "CUSTOMER" as const,
    },
  },
  {
    email: "manager123@gmail.com",
    password: "Manager123@",
    user: {
      userId: "mock-manager-001",
      email: "manager123@gmail.com",
      fullName: "Manager 123",
      role: "MANAGER" as const,
    },
  },
] satisfies ReadonlyArray<{ email: string; password: string; user: AuthUser }>;
