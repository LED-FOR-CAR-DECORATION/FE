"use client";

import { useState, type FormEvent } from "react";
import { loginToBackend } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useManagedUsers } from "../hooks/useManagedUsers";
import type { ManagedUserQuery } from "../types";

const initialQuery: ManagedUserQuery = { page: 0, size: 10 };
const field = "rounded border border-gray-300 bg-white px-3 py-2";

export default function ManagedUsersPanel() {
  const [token, setToken] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [attempt, setAttempt] = useState(0);
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const result = useManagedUsers(token, query, attempt);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signingIn) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setSigningIn(true);
    setLoginError("");
    try {
      const session = await loginToBackend(
        String(values.get("email")).trim(),
        String(values.get("password")),
      );
      if (!session.accessToken) throw new Error("Missing access token");
      form.reset();
      setToken(session.accessToken);
      setQuery(initialQuery);
    } catch (error) {
      setLoginError(
        error instanceof ApiError && [400, 401, 403].includes(error.status)
          ? "Không thể xác thực tài khoản. Vui lòng kiểm tra thông tin đăng nhập."
          : "Không kết nối được với hệ thống xác thực.",
      );
    } finally {
      setSigningIn(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const active = values.get("active");
    setQuery({
      page: 0,
      size: Number(values.get("size")),
      search: String(values.get("search")),
      role: String(values.get("role")),
      active: active === "" ? undefined : active === "true",
    });
  }

  const data = result?.data;

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-black">Quản lý người dùng</h1>
      {!token || result?.unauthorized ? (
        <form onSubmit={signIn} className="grid max-w-sm gap-3">
          <p>Xác thực bằng tài khoản Admin hoặc Manager trên hệ thống.</p>
          {result?.unauthorized && <p role="status">{result.error}</p>}
          <label className="grid gap-1">
            Email
            <input
              className={field}
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className="grid gap-1">
            Mật khẩu
            <input
              className={field}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {loginError && <p role="alert">{loginError}</p>}
          <button className="btn-primary" disabled={signingIn}>
            {signingIn ? "Đang xác thực…" : "Xác thực"}
          </button>
        </form>
      ) : (
        <>
          <form
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="grid gap-1">
              Tìm kiếm
              <input
                className={field}
                name="search"
                placeholder="Tên hoặc email"
                maxLength={255}
              />
            </label>
            <label className="grid gap-1">
              Vai trò
              <select className={field} name="role">
                <option value="">Tất cả</option>
                {["ADMIN", "MANAGER", "STAFF", "DESIGNER"].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Trạng thái
              <select className={field} name="active">
                <option value="">Tất cả</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
            </label>
            <label className="grid gap-1">
              Số dòng
              <select className={field} name="size">
                {[10, 20, 50].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary">Áp dụng</button>
            <button
              className={field}
              type="button"
              onClick={() => setToken("")}
            >
              Đổi tài khoản
            </button>
          </form>
          {!result && <p role="status">Đang tải danh sách…</p>}
          {result?.error && (
            <div role="alert">
              {result.error}{" "}
              <button
                className="underline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          )}
          {data && (
            <>
              {data.items.length === 0 ? (
                <p>Không tìm thấy tài khoản phù hợp.</p>
              ) : (
                <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {[
                          "Tên",
                          "Email",
                          "Điện thoại",
                          "Vai trò",
                          "Trạng thái",
                        ].map((label) => (
                          <th key={label} scope="col" className="p-3">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((user) => (
                        <tr
                          key={user.accountId}
                          className="border-t border-gray-200"
                        >
                          <td className="p-3">{user.name ?? "—"}</td>
                          <td className="p-3">{user.email}</td>
                          <td className="p-3">{user.phone ?? "—"}</td>
                          <td className="p-3">{user.role}</td>
                          <td className="p-3">
                            {user.active ? "Đang hoạt động" : user.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <nav
                aria-label="Phân trang người dùng"
                className="flex flex-wrap items-center gap-3"
              >
                <span>
                  {data.meta.totalElements} tài khoản · Trang{" "}
                  {data.meta.totalPages ? data.meta.page + 1 : 0}/
                  {data.meta.totalPages}
                </span>
                <button
                  className={field}
                  disabled={!data.meta.hasPrevious}
                  onClick={() =>
                    setQuery({ ...query, page: data.meta.page - 1 })
                  }
                >
                  Trước
                </button>
                <button
                  className={field}
                  disabled={!data.meta.hasNext}
                  onClick={() =>
                    setQuery({ ...query, page: data.meta.page + 1 })
                  }
                >
                  Sau
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </section>
  );
}
