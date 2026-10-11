"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { entitlementService } from "@/features/character/services/entitlement.service";
import type { UserEntitlement } from "@/features/character/types";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface GalleryContextValue {
  entitlements: UserEntitlement[];
  refresh: () => void;
}

const GalleryContext = createContext<GalleryContextValue | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<UserEntitlement[]>([]);
  const refresh = useCallback(() => setEntitlements(user ? entitlementService.listByUser(user.userId) : []), [user]);
  useEffect(() => { refresh(); }, [refresh]);
  return <GalleryContext.Provider value={{ entitlements, refresh }}>{children}</GalleryContext.Provider>;
}

export function useGallery() {
  const context = useContext(GalleryContext);
  if (!context) throw new Error("useGallery must be used inside <GalleryProvider>");
  return context;
}
