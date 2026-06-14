"use client";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { clearAuth, isSpecialistRole } from "@/lib/auth";
import { LogOut, Activity, Menu, X } from "lucide-react";
import { useState } from "react";
import NotificationsDropdown from "./NotificationsDropdown";

interface NavbarProps {
  user: User;
}

const roleColors: Record<string, string> = {
  NURSE: "bg-blue-100 text-blue-800",
  DOCTOR: "bg-emerald-100 text-emerald-800",
  GASTROENTEROLOGIST: "bg-emerald-100 text-emerald-800",
  HEPATOLOGIST: "bg-teal-100 text-teal-800",
  ADMIN: "bg-purple-100 text-purple-800",
  REFERRING_PHYSICIAN: "bg-orange-100 text-orange-800",
  RESEARCHER: "bg-slate-100 text-slate-800",
};

type NavLink = { href: string; label: string };

function getNavLinks(role: string): NavLink[] {
  const gastroLinks: NavLink[] = [
    { href: "/doctor/dashboard", label: "Dashboard" },
    { href: "/mdt", label: "MDT Board" },
    { href: "/analytics", label: "Analytics" },
    { href: "/doctor/procedures/new", label: "New Procedure" },
    { href: "/directory", label: "Directory" },
    { href: "/dashboard/facilities", label: "Facilities" },
    { href: "/member", label: "My Membership" },
    { href: "/conferences", label: "Conferences" },
  ];

  const hepatoLinks: NavLink[] = [
    { href: "/doctor/dashboard", label: "Dashboard" },
    { href: "/mdt", label: "MDT Board" },
    { href: "/analytics", label: "Analytics" },
    { href: "/liver-registry", label: "Liver Registry" },
    { href: "/doctor/procedures/new", label: "New Procedure" },
    { href: "/directory", label: "Directory" },
    { href: "/dashboard/facilities", label: "Facilities" },
    { href: "/member", label: "My Membership" },
    { href: "/conferences", label: "Conferences" },
  ];

  const navLinks: Record<string, NavLink[]> = {
    NURSE: [
      { href: "/nurse/intake", label: "New Intake" },
      { href: "/directory", label: "Directory" },
      { href: "/liver-registry", label: "Liver Registry" },
      { href: "/dashboard/facilities", label: "Facilities" },
    ],
    DOCTOR: gastroLinks,
    GASTROENTEROLOGIST: gastroLinks,
    HEPATOLOGIST: hepatoLinks,
    ADMIN: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/analytics", label: "Analytics" },
      { href: "/mdt", label: "MDT Board" },
      { href: "/liver-registry", label: "Liver Registry" },
      { href: "/doctor/procedures/new", label: "New Procedure" },
      { href: "/directory", label: "Directory" },
      { href: "/dashboard/facilities", label: "Facilities" },
      { href: "/doctor/dashboard", label: "Referrals" },
      { href: "/nurse/intake", label: "New Intake" },
      { href: "/conferences", label: "Conferences" },
    ],
    REFERRING_PHYSICIAN: [
      { href: "/doctor/dashboard", label: "Referrals" },
      { href: "/directory", label: "Directory" },
      { href: "/dashboard/facilities", label: "Facilities" },
      { href: "/member", label: "My Membership" },
      { href: "/conferences", label: "Conferences" },
    ],
    RESEARCHER: [
      { href: "/analytics", label: "Analytics" },
      { href: "/directory", label: "Directory" },
      { href: "/dashboard/facilities", label: "Facilities" },
      { href: "/conferences", label: "Conferences" },
    ],
  };

  if (navLinks[role]) return navLinks[role];
  if (isSpecialistRole(role)) return gastroLinks;
  return [];
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearAuth();
    router.replace("/auth/login");
  }

  const links = getNavLinks(user.role);
  const roleLabel = user.role.replace(/_/g, " ");

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 text-sm leading-none block">
                GastroRef
              </span>
              <span className="text-xs text-slate-500 leading-none">
                Ghana Gastro Registry
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 leading-none">
                {user.name}
              </p>
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user.role] ?? "bg-gray-100 text-gray-700"}`}
              >
                {roleLabel}
              </span>
            </div>
            <NotificationsDropdown />
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-slate-100 pt-2 space-y-1">
            {links.map((link) => (
              <button
                key={link.href}
                onClick={() => { router.push(link.href); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
