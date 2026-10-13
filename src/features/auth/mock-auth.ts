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
  {
    email: "staff123@gmail.com",
    password: "Staff123@",
    user: {
      userId: "mock-staff-001",
      email: "staff123@gmail.com",
      fullName: "Staff 123",
      role: "STAFF" as const,
    },
  },
  {
    email: "admin123@gmail.com",
    password: "Admin123@",
    user: {
      userId: "mock-admin-001",
      email: "admin123@gmail.com",
      fullName: "Admin 123",
      role: "ADMIN" as const,
    },
  },
] satisfies ReadonlyArray<{ email: string; password: string; user: AuthUser }>;
