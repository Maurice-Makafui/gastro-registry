"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Routes that should NOT show the sidebar
const AUTH_PATHS = ["/auth/login", "/auth/register"];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      {/* Offset for mobile fixed top bar rendered inside Sidebar */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
