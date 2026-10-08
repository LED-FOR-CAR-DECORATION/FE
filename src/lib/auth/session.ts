import type { User } from "@/context/AuthContext";

const SESSION_KEY = "mirage_session";

/** Persist a user session to localStorage */
export function saveSession(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Load a user session from localStorage (returns null if none) */
export function loadSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** Clear the stored session */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
