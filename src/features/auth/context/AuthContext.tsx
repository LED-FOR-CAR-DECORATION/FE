"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, normalizeUserRole, USE_MOCK_AUTH } from "@/features/auth/services/auth.service";
import type { AuthUser } from "@/features/auth/types";
import { apiGetMyProfile, apiUpdateMyProfile } from "@/lib/api/addresses";
import { clearSession, getRefreshToken, getSessionToken, loadSession, saveSession } from "@/lib/auth/session";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  updateProfile: (profile: Pick<AuthUser, "fullName" | "phoneNumber" | "dateOfBirth">) => Promise<void> | void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mergeRemoteProfile(
  base: AuthUser,
  remoteProfile: NonNullable<Awaited<ReturnType<typeof apiGetMyProfile>>>,
): AuthUser {
  return {
    ...base,
    userId: remoteProfile.accountId ? String(remoteProfile.accountId) : base.userId,
    email: remoteProfile.email ?? base.email,
    fullName: remoteProfile.name ?? base.fullName,
    phoneNumber: remoteProfile.phone ?? base.phoneNumber,
    role: remoteProfile.roles?.length ? normalizeUserRole(remoteProfile.roles, base.role) : base.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = loadSession();
      if (saved && !USE_MOCK_AUTH && !(await getSessionToken()) && !getRefreshToken()) {
        clearSession();
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      if (saved && !USE_MOCK_AUTH) {
        if (!cancelled) {
          setUser(saved);
        }
        try {
          const remoteProfile = await apiGetMyProfile();
          if (remoteProfile && !cancelled) {
            const hydrated = mergeRemoteProfile(saved, remoteProfile);
            saveSession(hydrated);
            setUser(hydrated);
            setIsLoading(false);
            return;
          }
        } catch {
          // Fallback to saved session if profile fetch fails temporarily
        }
      }
      if (!cancelled) {
        setUser(saved);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((nextUser: AuthUser) => {
    saveSession(nextUser);
    setUser(nextUser);
    if (!USE_MOCK_AUTH) {
      void apiGetMyProfile()
        .then((remoteProfile) => {
          if (!remoteProfile) return;
          const hydrated = mergeRemoteProfile(nextUser, remoteProfile);
          saveSession(hydrated);
          setUser(hydrated);
        })
        .catch(() => {});
    }
  }, []);

  const updateProfile = useCallback(
    async (profile: Pick<AuthUser, "fullName" | "phoneNumber" | "dateOfBirth">) => {
      if (!USE_MOCK_AUTH) {
        try {
          const updated = await apiUpdateMyProfile({
            name: profile.fullName,
            phone: profile.phoneNumber || null,
          });
          setUser((currentUser) => {
            if (!currentUser) return currentUser;
            const nextUser: AuthUser = {
              ...currentUser,
              fullName: updated?.name ?? profile.fullName,
              phoneNumber: updated?.phone ?? profile.phoneNumber,
              dateOfBirth: profile.dateOfBirth,
            };
            saveSession(nextUser);
            return nextUser;
          });
          return;
        } catch (err) {
          console.error("Failed to update profile on backend:", err);
        }
      }
      setUser((currentUser) => {
        if (!currentUser) return currentUser;
        const nextUser = { ...currentUser, ...profile };
        saveSession(nextUser);
        return nextUser;
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return context;
}
