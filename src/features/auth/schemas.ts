import type { RegisterInput } from "./types";

export type RegisterErrors = Partial<Record<keyof RegisterInput, string>>;

export function validateRegister(input: RegisterInput): RegisterErrors {
  const errors: RegisterErrors = {};
  const name = input.fullName.trim();
  const email = input.email.trim();
  if (name.length < 2 || name.length > 100) errors.fullName = "Họ tên phải có từ 2 đến 100 ký tự.";
  else if (/[\p{Cc}\p{Cf}]/u.test(name)) errors.fullName = "Họ tên chứa ký tự không hợp lệ.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Vui lòng nhập email hợp lệ (tối đa 254 ký tự).";
  if (input.password.length < 8 || input.password.length > 72 || new TextEncoder().encode(input.password).length > 72) {
    errors.password = "Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.";
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])[^\s]+$/.test(input.password)) {
    errors.password = "Mật khẩu cần chữ hoa, chữ thường, số, ký tự đặc biệt và không chứa khoảng trắng.";
  }
  if (!input.confirmPassword) errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  else if (input.password !== input.confirmPassword) errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  return errors;
}
