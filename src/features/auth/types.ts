export type UserRole = "CUSTOMER" | "DESIGNER" | "STAFF" | "MANAGER" | "ADMIN";

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}