import React from "react";
import InternalShell from "@/components/layout/InternalShell";

/** Shared layout for all internal roles (designer, staff, manager, admin). */
export default function ManagementShell({ children }: { children: React.ReactNode }) {
  return <InternalShell>{children}</InternalShell>;
}
