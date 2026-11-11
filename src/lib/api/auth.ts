import { apiRequest } from "./client";

export function loginToBackend(email: string, password: string) {
  return apiRequest<{ accessToken: string }>("auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
