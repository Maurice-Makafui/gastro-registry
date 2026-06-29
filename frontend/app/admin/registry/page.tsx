"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import {
  networkRegistryApi,
  RegistryEntry,
  ApprovalStatus,
  RegistryStatus,
} from "@/lib/api/network-registry";
import { facilitiesApi } from "@/lib/api";
import { specialistsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, PlusCircle, ShieldCheck, ShieldOff } from "lucide-react";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"];

function statusBadge(entry: RegistryEntry) {
  if (entry.approval_status === "APPROVED_BY_GASLID" && entry.registry_status === "ACTIVE") {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Approved</span>;
  }
  if (entry.registry_status === "SUSPENDED") {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Suspended</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>;
}

function RegistryPageContent() {
  const router = useRouter();
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [facilities, setFacilities] = useState<{ id: number; facility_name: string }[]>([]);
  const [specialists, setSpecialists] = useState<{ id: number; name: string; specialty: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suspendId, setSuspendId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const [form, setForm] = useState({
    entity_type: "FACILITY" as "FACILITY" | "SPECIALIST",
    facility_id: "",
    specialist_id: "",
    registry_number: "",
    region: "",
    district: "",
    expiry_date: "",
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (!ADMIN_ROLES.includes(u?.role ?? "")) { router.replace("/dashboard"); return; }
    load();
    facilitiesApi.list({ limit: 200 }).then((r) => setFacilities(r.data)).catch(() => {});
    specialistsApi.list({ limit: 200 }).then((r) =>
      setSpecialists(r.data.map((s: any) => ({ id: s.id, name: s.user?.name ?? s.name, specialty: s.specialty })))
    ).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    networkRegistryApi.list().then((r) => setEntries(r.data)).catch(() => toast.error("Failed to load registry")).finally(() => setLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.registry_number.trim()) { toast.error("Registry number required"); return; }
    if (form.entity_type === "FACILITY" && !form.facility_id) { toast.error("Select a facility"); return; }
    if (form.entity_type === "SPECIALIST" && !form.specialist_id) { toast.error("Select a specialist"); return; }
    setSubmitting(true);
    try {
      await networkRegistryApi.create({
        entity_type: form.entity_type,
        facility_id: form.entity_type === "FACILITY" ? Number(form.facility_id) : undefined,
        specialist_id: form.entity_type === "SPECIALIST" ? Number(form.specialist_id) : undefined,
        registry_number: form.registry_number,
        region: form.region || undefined,
        district: form.district || undefined,
        expiry_date: form.expiry_date || undefined,
      });
      toast.success("Registry entry created");
      setShowForm(false);
      setForm({ entity_type: "FACILITY", facility_id: "", specialist_id: "", registry_number: "", region: "", district: "", expiry_date: "" });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(entry: RegistryEntry) {
    try {
      await networkRegistryApi.approve(entry.id, entry.expiry_date ?? undefined);
      toast.success("Entry approved");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to approve");
    }
  }

  async function handleSuspend() {
    if (!suspendId || !suspendReason.trim()) { toast.error("Reason required"); return; }
    try {
      await networkRegistryApi.suspend(suspendId, suspendReason);
      toast.success("Entry suspended");
      setSuspendId(null);
      setSuspendReason("");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to suspend");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">GASLID Network Registry</h1>
          <p className="text-sm text-slate-500">Onboard and approve facilities/specialists for referral eligibility</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">New Registry Entry</h2>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Entity Type</label>
              <select className="input" value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value as any, facility_id: "", specialist_id: "" })}>
                <option value="FACILITY">Facility</option>
                <option value="SPECIALIST">Specialist</option>
              </select>
            </div>

            {form.entity_type === "FACILITY" ? (
              <div>
                <label className="label">Facility *</label>
                <select className="input" value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })}>
                  <option value="">Select facility…</option>
                  {facilities.map((f) => <option key={f.id} value={f.id}>{f.facility_name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="label">Specialist *</label>
                <select className="input" value={form.specialist_id} onChange={(e) => setForm({ ...form, specialist_id: e.target.value })}>
                  <option value="">Select specialist…</option>
                  {specialists.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.specialty}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">Registry Number *</label>
              <input className="input" placeholder="e.g. GASLID-2024-001" value={form.registry_number} onChange={(e) => setForm({ ...form, registry_number: e.target.value })} />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input type="date" className="input" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Region</label>
              <input className="input" placeholder="e.g. Greater Accra" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
            <div>
              <label className="label">District</label>
              <input className="input" placeholder="e.g. Accra Metro" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Saving…" : "Create Entry"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Suspend modal */}
      {suspendId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-slate-900">Suspend Entry</h3>
            <textarea className="input resize-none" rows={3} placeholder="Reason for suspension…" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={handleSuspend} className="btn-primary bg-red-600 hover:bg-red-700">Suspend</button>
              <button onClick={() => { setSuspendId(null); setSuspendReason(""); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Registry #", "Type", "Name", "Region", "Expiry", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No registry entries yet. Add one above.</td></tr>
              )}
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{entry.registry_number}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${entry.entity_type === "FACILITY" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {entry.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{entry.facility_name ?? entry.specialist_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.region ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.expiry_date ?? "—"}</td>
                  <td className="px-4 py-3">{statusBadge(entry)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {entry.approval_status !== "APPROVED_BY_GASLID" && entry.registry_status !== "SUSPENDED" && (
                        <button onClick={() => handleApprove(entry)} title="Approve" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      {entry.registry_status !== "SUSPENDED" && (
                        <button onClick={() => { setSuspendId(entry.id); setSuspendReason(""); }} title="Suspend" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <ShieldOff className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RegistryAdminPage() {
  return (
    <Suspense>
      <RegistryPageContent />
    </Suspense>
  );
}
