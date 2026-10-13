import { DEMO_ACCOUNTS } from "../mock-auth";
import type { AuthUser, RegisterInput } from "../types";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MockAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockAuthError";
  }
}

/** Prototype-only boundary. Replace these methods with backend API calls later. */
export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    await wait(500);
    const account = DEMO_ACCOUNTS.find(
      (item) => item.email === email.trim().toLowerCase() && item.password === password,
    );
    if (!account) {
      throw new MockAuthError("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin đăng nhập.");
    }
    return account.user;
  },
  async logout(): Promise<void> { await wait(150); },
  async getCurrentUser(): Promise<AuthUser | null> { return null; },
  async register(data: RegisterInput): Promise<void> {
    await wait(600);
    if (DEMO_ACCOUNTS.some((account) => account.email === data.email.trim().toLowerCase())) {
      throw new MockAuthError("Email này đã được dùng trong tài khoản demo.");
    }
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
