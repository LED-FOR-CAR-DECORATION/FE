"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { createInternalUser } from "@/lib/api/users";
import { INTERNAL_ROLES, type InternalRole } from "../types";

const field = "rounded border border-gray-300 bg-white px-3 py-2";

export default function CreateUserPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<InternalRole>("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createInternalUser({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        phone: phone.trim(),
      });
      router.push("/admin/users");
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status === 409
          ? "Email này đã tồn tại."
          : status === 400
            ? "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
            : status === 401
              ? "Phiên đã hết hạn. Vui lòng đăng nhập lại."
              : status === 403
                ? "Chỉ tài khoản Admin được tạo người dùng."
                : "Không thể tạo người dùng. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-lg space-y-5">
      <h1 className="text-2xl font-black">Thêm người dùng</h1>
      <p className="text-sm text-gray-600">
        Mật khẩu sẽ được hệ thống tự tạo và gửi tới email của người dùng.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1">
          Họ và tên
          <input
            className={field}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={255}
            required
          />
        </label>
        <label className="grid gap-1">
          Email
          <input
            className={field}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            required
          />
        </label>
        <label className="grid gap-1">
          Số điện thoại
          <input
            className={field}
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          Vai trò
          <select
            className={field}
            value={role}
            onChange={(e) => setRole(e.target.value as InternalRole)}
          >
            {INTERNAL_ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Đang tạo…" : "Tạo người dùng"}
          </button>
          <button
            type="button"
            className={field}
            disabled={loading}
            onClick={() => router.push("/admin/users")}
          >
            Hủy
          </button>
        </div>
      </form>
    </section>
  );
}

