"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isSuperAdmin } from "@/lib/auth";
import { surveillanceApi, UserAdminOut } from "@/lib/api/surveillance";
import { facilitiesApi } from "@/lib/api";
import { User } from "@/types";
import toast from "react-hot-toast";
import { ShieldCheck, Users, Building2, RefreshCw, ToggleLeft, ToggleRight, UserPlus } from "lucide-react";

const ALL_ROLES = [
  "SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "DOCTOR",
  "GASTROENTEROLOGIST", "HEPATOLOGIST", "NURSE",
  "REFERRING_PHYSICIAN", "RESEARCHER",
];

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  PLATFORM_ADMIN: "bg-orange-100 text-orange-700",
  ADMIN: "bg-purple-100 text-purple-700",
  GASTROENTEROLOGIST: "bg-emerald-100 text-emerald-700",
  HEPATOLOGIST: "bg-teal-100 text-teal-700",
  DOCTOR: "bg-emerald-100 text-emerald-700",
  NURSE: "bg-blue-100 text-blue-700",
  REFERRING_PHYSICIAN: "bg-amber-100 text-amber-700",
  RESEARCHER: "bg-slate-100 text-slate-600",
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserAdminOut[]>([]);
  const [facilityCount, setFacilityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, facRes] = await Promise.all([
        surveillanceApi.listUsers({ limit: 200 }),
        facilitiesApi.list(),
      ]);
      setUsers(userRes.data);
      setFacilityCount(facRes.data.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role ?? "")) { router.replace("/auth/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (user) loadUsers();
  }, [user, loadUsers]);

  async function handleRoleChange(userId: number, role: string) {
    setUpdatingId(userId);
    try {
      const res = await surveillanceApi.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: res.data.role } : u));
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(userId: number, current: boolean) {
    setUpdatingId(userId);
    try {
      const res = await surveillanceApi.toggleUserActive(userId, !current);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
      toast.success(res.data.is_active ? "User activated" : "User deactivated");
    } catch {
      toast.error("Failed to update user");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-600" />
            Super Admin Console
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform-wide user and system governance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/admin/users")} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button onClick={loadUsers} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Users", value: users.filter((u) => u.is_active).length, icon: Users, color: "text-green-600", bg: "bg-green-50" },
          { label: "Inactive", value: users.filter((u) => !u.is_active).length, icon: Users, color: "text-red-600", bg: "bg-red-50" },
          { label: "Facilities", value: facilityCount, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-56"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* User table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Name", "Email", "Role", "Facility", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 ${!u.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600"}`}
                        value={u.role}
                        disabled={updatingId === u.id || u.id === user?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.facility_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={updatingId === u.id || u.id === user?.id}
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        {u.is_active
                          ? <ToggleRight className="w-5 h-5 text-green-600" />
                          : <ToggleLeft className="w-5 h-5 text-slate-400" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-10">No users match filters</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
