"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/features/auth/services/auth.service";
import type { AuthUser } from "@/features/auth/types";
import { clearSession, loadSession, saveSession } from "@/lib/auth/session";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(loadSession());
    setIsLoading(false);
  }, []);

  const login = useCallback((nextUser: AuthUser) => {
    saveSession(nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return context;
}
