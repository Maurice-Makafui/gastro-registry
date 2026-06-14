"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import NotificationsDropdown from "./NotificationsDropdown";

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

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop-only top bar with notifications */}
        <header className="hidden lg:flex items-center justify-end gap-3 px-6 h-12 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20">
          <NotificationsDropdown />
        </header>

        {/* Offset for mobile fixed top bar rendered inside Sidebar */}
        <main className="flex-1 pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
