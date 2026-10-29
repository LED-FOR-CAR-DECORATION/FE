import { DEMO_ACCOUNTS } from "../mock-auth";
import type { AuthUser, RegisterInput } from "../types";
import { loginWithPassword, registerAccount } from "@/lib/api/auth";
import { clearSession, loadSession } from "@/lib/auth/session";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MockAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockAuthError";
  }
}

/** Login and registration use the backend; password recovery remains prototype-only. */
export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    return loginWithPassword(email, password);
  },
  async logout(): Promise<void> { clearSession(); },
  async getCurrentUser(): Promise<AuthUser | null> { return loadSession(); },
  async register(data: RegisterInput): Promise<void> {
    await registerAccount(data);
  },
  async requestPasswordReset(email: string): Promise<void> {
    await wait(600);
    if (!DEMO_ACCOUNTS.some((account) => account.email === email.trim().toLowerCase())) {
      throw new MockAuthError("Không tìm thấy tài khoản với email này.");
    }
  },
  async verifyCurrentPassword(email: string, password: string): Promise<void> {
    await wait(500);
    const account = DEMO_ACCOUNTS.find(
      (item) => item.email === email.trim().toLowerCase() && item.password === password,
    );
    if (!account) throw new MockAuthError("Mật khẩu hiện tại không đúng.");
  },
  async sendPasswordOtp(email: string): Promise<void> {
    await this.requestPasswordReset(email);
  },
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await wait(500);
    if (otp !== "123456") throw new MockAuthError("Mã OTP không đúng hoặc đã hết hạn.");
    if (newPassword.length < 8) throw new MockAuthError("Mật khẩu mới phải có ít nhất 8 ký tự.");
    const account = DEMO_ACCOUNTS.find((item) => item.email === email.trim().toLowerCase());
    if (!account) throw new MockAuthError("Không tìm thấy tài khoản với email này.");
    account.password = newPassword;
  },
};
