"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import { getManagedUserDetail } from "@/lib/api/users";
import type { ManagedUserDetail } from "../types";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  MANAGER: "bg-purple-100 text-purple-700 border-purple-200",
  DESIGNER: "bg-blue-100 text-blue-700 border-blue-200",
  STAFF: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center gap-3 border-t border-gray-100 py-3 text-sm first:border-t-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-800">{children}</dd>
    </div>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

export default function UserDetailPage({ userId }: { userId: string }) {
  const [state, setState] = useState<{
    id: string;
    user?: ManagedUserDetail;
    error?: string;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    getManagedUserDetail(userId, controller.signal).then(
      (user) => {
        if (!controller.signal.aborted) setState({ id: userId, user });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const status = isAxiosError(err) ? err.response?.status : undefined;
        setState({
          id: userId,
          error:
            status === 403
              ? "Bạn không có quyền xem người dùng này (Admin hoặc Manager; tài khoản CUSTOMER bị từ chối)."
              : status === 404
                ? "Không tìm thấy người dùng."
                : status === 401
                  ? "Phiên đã hết hạn. Vui lòng đăng nhập lại."
                  : status === 400
                    ? "Mã người dùng không hợp lệ."
                    : "Không tải được thông tin người dùng.",
        });
      },
    );
    return () => controller.abort();
  }, [userId]);

  const current = state?.id === userId ? state : undefined;
  const user = current?.user;

  return (
    <section className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Chi tiết người dùng</h1>
        <Link href="/admin/users" className="text-sm font-semibold text-[#155e59] underline">
          ← Quay lại danh sách
        </Link>
      </div>

      {!current && (
        <div role="status" aria-label="Đang tải" className="animate-pulse space-y-3 rounded border border-gray-200 bg-white p-5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-5 rounded bg-gray-200" />
          ))}
        </div>
      )}

      {current?.error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {current.error}
        </p>
      )}

      {user && (
        <div className="space-y-4">
          <dl className="rounded border border-gray-200 bg-white px-5 py-2">
            <h2 className="pt-3 text-xs font-black uppercase tracking-wide text-gray-400">Thông tin cá nhân</h2>
            <Row label="Họ và tên">{user.name ?? "—"}</Row>
            <Row label="Email">{user.email}</Row>
            <Row label="Điện thoại">{user.phone ?? "—"}</Row>
          </dl>

          <dl className="rounded border border-gray-200 bg-white px-5 py-2">
            <h2 className="pt-3 text-xs font-black uppercase tracking-wide text-gray-400">Tài khoản</h2>
            <Row label="Vai trò">
              <Badge className={ROLE_STYLES[user.role] ?? "bg-gray-100 text-gray-700 border-gray-200"}>{user.role}</Badge>
            </Row>
            <Row label="Trạng thái">
              {user.status === "ACTIVE" ? (
                <Badge className="bg-green-100 text-green-700 border-green-200">Đang hoạt động</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-600 border-gray-300">Không hoạt động ({user.status})</Badge>
              )}
            </Row>
            <Row label="Khóa đăng nhập">
              {user.lockout.locked ? (
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  Đang bị khóa{user.lockout.lockoutUntil ? ` đến ${formatDate(user.lockout.lockoutUntil)}` : ""}
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200">Không bị khóa</Badge>
              )}
            </Row>
            <Row label="Số lần sai mật khẩu">{user.lockout.failedAttempts}</Row>
            <Row label="Ngày tạo">{formatDate(user.createdAt)}</Row>
            <Row label="Cập nhật lần cuối">{formatDate(user.updatedAt)}</Row>
          </dl>
        </div>
      )}
    </section>
  );
}

