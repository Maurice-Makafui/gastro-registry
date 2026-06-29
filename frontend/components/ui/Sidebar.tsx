"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  FileText,
  ClipboardPlus,
  Stethoscope,
  Users,
  BookOpen,
  BarChart3,
  CalendarDays,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Database,
  ShieldCheck,
  Globe,
  Network,
} from "lucide-react";
import { getUser, clearAuth, isSpecialistRole, isSuperAdmin, isPlatformAdmin } from "@/lib/auth";
import { User, UserRole } from "@/types";
import NotificationsDropdown from "./NotificationsDropdown";

// ── Role badge colours ────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  NURSE: "bg-blue-500/20 text-blue-300",
  DOCTOR: "bg-emerald-500/20 text-emerald-300",
  GASTROENTEROLOGIST: "bg-emerald-500/20 text-emerald-300",
  HEPATOLOGIST: "bg-teal-500/20 text-teal-300",
  ADMIN: "bg-purple-500/20 text-purple-300",
  SUPER_ADMIN: "bg-red-500/20 text-red-300",
  PLATFORM_ADMIN: "bg-orange-500/20 text-orange-300",
  REFERRING_PHYSICIAN: "bg-orange-500/20 text-orange-300",
  RESEARCHER: "bg-slate-500/20 text-slate-300",
};

// ── Nav item definition ───────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  dividerBefore?: string;
}

const ALL_ITEMS: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/admin/super",            label: "Super Admin",      icon: ShieldCheck, exact: true },
    { href: "/admin/platform",         label: "Platform",         icon: Globe },
    { href: "/admin/users",            label: "Users",            icon: Users },
    { href: "/surveillance/dashboard", label: "Surveillance",     icon: Activity },
    { href: "/admin/dashboard",        label: "Analytics",        icon: BarChart3 },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/doctor/dashboard",       label: "Referrals",        icon: FileText },
    { href: "/admin/registry",         label: "Network Registry", icon: Network, dividerBefore: "Registry" },
  ],
  PLATFORM_ADMIN: [
    { href: "/admin/platform",         label: "Platform Admin",   icon: Globe, exact: true },
    { href: "/admin/users",            label: "Users",            icon: Users },
    { href: "/surveillance/dashboard", label: "Surveillance",     icon: Activity },
    { href: "/admin/dashboard",        label: "Analytics",        icon: BarChart3 },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/admin/registry",         label: "Network Registry", icon: Network, dividerBefore: "Registry" },
  ],
  FACILITY_ADMIN: [
    { href: "/admin/dashboard",        label: "Dashboard",        icon: LayoutDashboard, exact: true },
    { href: "/admin/users",            label: "Users",            icon: Users },
    { href: "/doctor/dashboard",       label: "Referrals",        icon: FileText },
    { href: "/doctor/referral/new",    label: "New Referral",     icon: ClipboardPlus },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
    { href: "/analytics",              label: "Analytics",        icon: BarChart3 },
    { href: "/admin/registry",         label: "Network Registry", icon: Network, dividerBefore: "Registry" },
  ],
  ADMIN: [
    { href: "/admin/dashboard",        label: "Dashboard",        icon: LayoutDashboard, exact: true },
    { href: "/doctor/dashboard",       label: "Referrals",        icon: FileText },
    { href: "/nurse/intake",           label: "New Intake",       icon: ClipboardPlus },
    { href: "/doctor/procedures/new",  label: "Procedures",       icon: Stethoscope },
    { href: "/registries",             label: "Registries",       icon: Database },
    { href: "/mdt",                    label: "MDT Board",        icon: Users },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
    { href: "/analytics",              label: "Analytics",        icon: BarChart3 },
    { href: "/conferences",            label: "Conferences",      icon: CalendarDays },
    { href: "/admin/registry",         label: "Network Registry", icon: Network, dividerBefore: "Registry" },
  ],
  NURSE: [
    { href: "/nurse/intake",           label: "New Intake",       icon: ClipboardPlus, exact: true },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/registries",             label: "Registries",       icon: Database },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
  ],
  REFERRING_PHYSICIAN: [
    { href: "/doctor/dashboard",       label: "Referrals",        icon: FileText, exact: true },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
    { href: "/member",                 label: "My Membership",    icon: Users },
    { href: "/conferences",            label: "Conferences",      icon: CalendarDays },
  ],
  RESEARCHER: [
    { href: "/analytics",              label: "Analytics",        icon: BarChart3, exact: true },
    { href: "/registries",             label: "Registries",       icon: Database },
    { href: "/directory",              label: "Directory",        icon: BookOpen },
    { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
    { href: "/conferences",            label: "Conferences",      icon: CalendarDays },
  ],
};

const GASTRO_ITEMS: NavItem[] = [
  { href: "/doctor/dashboard",       label: "Dashboard",        icon: LayoutDashboard, exact: true },
  { href: "/doctor/referral/new",    label: "New Referral",     icon: ClipboardPlus },
  { href: "/doctor/procedures/new",  label: "Procedures",       icon: Stethoscope },
  { href: "/registries",             label: "Registries",       icon: Database },
  { href: "/mdt",                    label: "MDT Board",        icon: Users },
  { href: "/analytics",              label: "Analytics",        icon: BarChart3 },
  { href: "/directory",              label: "Directory",        icon: BookOpen },
  { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
  { href: "/member",                 label: "My Membership",    icon: Activity },
  { href: "/conferences",            label: "Conferences",      icon: CalendarDays },
];

const HEPATO_ITEMS: NavItem[] = [
  { href: "/doctor/dashboard",       label: "Dashboard",        icon: LayoutDashboard, exact: true },
  { href: "/doctor/referral/new",    label: "New Referral",     icon: ClipboardPlus },
  { href: "/registries",             label: "Registries",       icon: Database },
  { href: "/doctor/procedures/new",  label: "Procedures",       icon: Stethoscope },
  { href: "/mdt",                    label: "MDT Board",        icon: Users },
  { href: "/analytics",              label: "Analytics",        icon: BarChart3 },
  { href: "/directory",              label: "Directory",        icon: BookOpen },
  { href: "/dashboard/facilities",   label: "Facilities",       icon: Building2 },
  { href: "/member",                 label: "My Membership",    icon: Activity },
  { href: "/conferences",            label: "Conferences",      icon: CalendarDays },
];

function getNavItems(role: string): NavItem[] {
  if (role === "HEPATOLOGIST") return HEPATO_ITEMS;
  if (role === "GASTROENTEROLOGIST" || role === "DOCTOR") return GASTRO_ITEMS;
  if (isSpecialistRole(role)) return GASTRO_ITEMS;
  if (isSuperAdmin(role)) return ALL_ITEMS["SUPER_ADMIN"] ?? [];
  if (isPlatformAdmin(role)) return ALL_ITEMS["PLATFORM_ADMIN"] ?? [];
  if (role === "FACILITY_ADMIN") return ALL_ITEMS["FACILITY_ADMIN"] ?? [];
  return ALL_ITEMS[role as UserRole] ?? [];
}

// ── Active-route helper ───────────────────────────────────────────────────────
function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// ── NavLink sub-component ─────────────────────────────────────────────────────
function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const router = useRouter();
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        router.push(item.href);
        onClick?.();
      }}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-150 group relative
        ${
          active
            ? "bg-brand-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-700/60 hover:text-slate-100"
        }
      `}
    >
      <Icon
        className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
          active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      <span className="truncate">{item.label}</span>
      {active && (
        <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-brand-200" />
      )}
    </button>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearAuth();
    router.replace("/auth/login");
  }

  const navItems = user ? getNavItems(user.role) : [];
  const roleLabel = user?.role.replace(/_/g, " ") ?? "";

  // ── Sidebar content (shared between desktop & mobile) ──────────────────────
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none truncate">
              GastroRef
            </p>
            <p className="text-xs text-slate-400 leading-none mt-0.5 truncate">
              Ghana Gastro Registry
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <div key={item.href}>
              {item.dividerBefore && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {item.dividerBefore}
                </p>
              )}
              <NavLink
                item={item}
                pathname={pathname}
                onClick={() => setMobileOpen(false)}
              />
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-slate-700/50 pt-3">
          {/* Settings */}
          <button
            onClick={() => router.push("/settings")}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                isActive(pathname, "/settings")
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:bg-slate-700/60 hover:text-slate-100"
              }
            `}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2.5 px-3 py-3 mt-1 rounded-lg bg-slate-800/60">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-100">
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate leading-tight">
                {user?.name ?? "—"}
              </p>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  ROLE_COLORS[user?.role ?? ""] ?? "bg-slate-700 text-slate-300"
                }`}
              >
                {roleLabel}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-slate-900 border-r border-slate-700/50 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-700/50 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">GastroRef</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer backdrop ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <aside
        className={`
          lg:hidden fixed top-14 left-0 bottom-0 z-40 w-72 bg-slate-900
          border-r border-slate-700/50 transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
