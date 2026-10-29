"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/features/auth/services/auth.service";
import type { AuthUser } from "@/features/auth/types";
import { clearSession, loadSession, saveSession, SESSION_CHANGED } from "@/lib/auth/session";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  updateProfile: (profile: Pick<AuthUser, "fullName" | "phoneNumber" | "dateOfBirth">) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(loadSession());
    setIsLoading(false);
    const synchronize = () => setUser(loadSession());
    window.addEventListener(SESSION_CHANGED, synchronize);
    window.addEventListener("focus", synchronize);
    const timer = window.setInterval(synchronize, 30_000);
    return () => {
      window.removeEventListener(SESSION_CHANGED, synchronize);
      window.removeEventListener("focus", synchronize);
      window.clearInterval(timer);
    };
  }, []);

  const login = useCallback((nextUser: AuthUser) => {
    saveSession(nextUser);
    setUser(nextUser);
  }, []);

  const updateProfile = useCallback((profile: Pick<AuthUser, "fullName" | "phoneNumber" | "dateOfBirth">) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...profile };
      saveSession(nextUser);
      return nextUser;
    });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, updateProfile, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return context;
}
