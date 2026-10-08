import React from "react";
import ManagerSidebar from "@/components/layout/ManagerSidebar";
import ManagerTopBar from "@/components/layout/ManagerTopBar";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ManagerTopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
