"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { surveillanceApi, UserAdminOut } from "@/lib/api/surveillance";
import { facilitiesApi } from "@/lib/api";
import toast from "react-hot-toast";
import { UserRole } from "@/types";
import { ShieldCheck, RefreshCw, UserPlus, X, Loader2 } from "lucide-react";

type FacilityOption = { id: number; facility_name: string };

const ALL_ROLES = [
  "SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "FACILITY_ADMIN",
  "DOCTOR", "GASTROENTEROLOGIST", "HEPATOLOGIST",
  "NURSE", "REFERRING_PHYSICIAN", "RESEARCHER",
];

const EMPTY_FORM = {
  name: "", email: "", password: "", role: "NURSE",
  department: "", phone: "", facility_id: "",
};

export default function UsersAdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [users, setUsers] = useState<UserAdminOut[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");

  // Add User modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!me) return;
    setLoading(true);
    try {
      const [u, fac] = await Promise.all([
        surveillanceApi.listUsers({ limit: 500 }),
        facilitiesApi.list(),
      ]);
      setUsers(u.data);
      setFacilities(fac.data.map((f: any) => ({ id: f.id, facility_name: f.facility_name })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (!u?.role || !["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(u.role)) {
      router.replace("/auth/login"); return;
    }
    setMe(u);
  }, [router]);

  useEffect(() => { load(); }, [me]); // eslint-disable-line

  const filtered = useMemo(() => users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || (statusFilter === "ACTIVE" ? u.is_active : !u.is_active);
    const matchFacility = !facilityFilter || String(u.facility_id ?? "") === facilityFilter;
    return matchSearch && matchRole && matchStatus && matchFacility;
  }), [users, search, roleFilter, statusFilter, facilityFilter]);

  async function handleToggleActive(userId: number, newActive: boolean) {
    setBusyId(userId);
    try {
      const res = await surveillanceApi.toggleUserActive(userId, newActive);
      setUsers((prev) => prev.map((x) => x.id === userId ? { ...x, is_active: res.data.is_active } : x));
      toast.success(newActive ? "User reactivated" : "User suspended");
    } catch { toast.error("Permission denied or failed"); }
    finally { setBusyId(null); }
  }

  async function handleRoleChange(userId: number, role: string) {
    setBusyId(userId);
    try {
      const res = await surveillanceApi.updateUserRole(userId, role);
      setUsers((prev) => prev.map((x) => x.id === userId ? { ...x, role: res.data.role } : x));
      toast.success("Role updated");
    } catch { toast.error("Permission denied or failed"); }
    finally { setBusyId(null); }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required"); return;
    }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setCreating(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department || undefined,
        phone: form.phone || undefined,
        facility_id: form.facility_id ? parseInt(form.facility_id) : undefined,
      };
      const res = await surveillanceApi.createUser(payload);
      setUsers((prev) => [res.data, ...prev]);
      toast.success(`User "${res.data.name}" created`);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create user");
    } finally { setCreating(false); }
  }

  if (!me) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col lg:flex-row gap-3">
        <input className="input flex-1" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input lg:w-52" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input lg:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="input lg:w-56" value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)}>
          <option value="">All facilities</option>
          {facilities.map((f) => <option key={f.id} value={String(f.id)}>{f.facility_name}</option>)}
        </select>
      </div>

      {/* Table */}
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
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 ${!u.is_active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border-0"
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.facility_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={busyId === u.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${u.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                        onClick={() => handleToggleActive(u.id, !u.is_active)}
                      >
                        {u.is_active ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No users match filters</p>}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                Add New User
              </h2>
              <button onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" placeholder="Dr. Jane Doe" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" placeholder="jane@hospital.gh" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Password *</label>
                  <input className="input" type="password" placeholder="Min. 6 characters" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <label className="label">Role *</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Department</label>
                  <input className="input" placeholder="e.g. Gastroenterology" value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+233 …" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Facility</label>
                <select className="input" value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })}>
                  <option value="">No facility</option>
                  {facilities.map((f) => <option key={f.id} value={String(f.id)}>{f.facility_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create User"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }}
                  className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
