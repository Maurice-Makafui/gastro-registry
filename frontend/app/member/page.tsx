"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award, CheckCircle2, Clock, AlertCircle,
  BookOpen, Download, Plus, TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/ui/Navbar";
import { getUser } from "@/lib/auth";
import { getMyMembership, addCPDPoints, getGuidelines } from "@/lib/api/members";
import type { Membership, Guideline } from "@/types/analytics";
import type { User } from "@/types";

const CPD_TARGET = 50; // points required per cycle

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  ACTIVE:  { label: "Active",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     icon: Clock },
  EXPIRED: { label: "Expired", color: "text-red-700",     bg: "bg-red-50 border-red-200",          icon: AlertCircle },
};

const CATEGORY_COLORS: Record<string, string> = {
  Hepatology:    "bg-teal-100 text-teal-700",
  Endoscopy:     "bg-blue-100 text-blue-700",
  "Emergency GI": "bg-red-100 text-red-700",
  Oncology:      "bg-purple-100 text-purple-700",
};

export default function MemberPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCPD, setAddingCPD] = useState(false);
  const [cpdInput, setCpdInput] = useState("");
  const [showCPDForm, setShowCPDForm] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    setUser(u);
    Promise.all([getMyMembership(), getGuidelines()])
      .then(([m, g]) => { setMembership(m); setGuidelines(g); })
      .catch(() => toast.error("Failed to load member data"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddCPD(e: React.FormEvent) {
    e.preventDefault();
    const pts = parseFloat(cpdInput);
    if (!pts || pts <= 0) return;
    setAddingCPD(true);
    try {
      const updated = await addCPDPoints(pts);
      setMembership(updated);
      setCpdInput("");
      setShowCPDForm(false);
      toast.success(`${pts} CPD point${pts !== 1 ? "s" : ""} logged`);
    } catch {
      toast.error("Failed to log CPD points");
    } finally {
      setAddingCPD(false);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const m = membership!;
  const cpdPct = Math.min(Math.round((Number(m.cpd_points_accumulated) / CPD_TARGET) * 100), 100);
  const statusCfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Member Portal</h1>
            <p className="text-sm text-slate-500">Ghana Gastroenterology Association</p>
          </div>
        </div>

        {/* Membership card */}
        <div className={`card p-6 border ${statusCfg.bg}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-indigo-600">
                  {(m.member_name ?? user.name).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg leading-tight">{m.member_name ?? user.name}</p>
                <p className="text-sm text-slate-500">{m.member_email ?? user.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">{(m.member_role ?? user.role).replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusCfg.label}
              </span>
              {m.renewal_date && (
                <p className="text-xs text-slate-500">
                  Renewal: {new Date(m.renewal_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              <p className="text-xs text-slate-400">Member since {new Date(m.created_at).getFullYear()}</p>
            </div>
          </div>
        </div>

        {/* CPD tracker */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-900 text-sm">CPD Points Tracker</h2>
            </div>
            <button
              onClick={() => setShowCPDForm((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Log Points
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{Number(m.cpd_points_accumulated)} pts accumulated</span>
              <span>Target: {CPD_TARGET} pts</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${cpdPct >= 100 ? "bg-emerald-500" : cpdPct >= 60 ? "bg-indigo-500" : "bg-amber-400"}`}
                style={{ width: `${cpdPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {cpdPct >= 100
                ? "✅ CPD requirement met for this cycle"
                : `${CPD_TARGET - Number(m.cpd_points_accumulated)} points remaining to meet cycle requirement`}
            </p>
          </div>

          {/* Add CPD inline form */}
          {showCPDForm && (
            <form onSubmit={handleAddCPD} className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <input
                type="number"
                min="0.5"
                step="0.5"
                max="50"
                value={cpdInput}
                onChange={(e) => setCpdInput(e.target.value)}
                placeholder="Points (e.g. 2.5)"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={addingCPD}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {addingCPD ? "Saving…" : "Log"}
              </button>
              <button
                type="button"
                onClick={() => setShowCPDForm(false)}
                className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Association guidelines */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Association Guidelines & Protocols</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {guidelines.map((g) => (
              <div key={g.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${CATEGORY_COLORS[g.category] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {g.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{g.published_date}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{g.title}</p>
                  {g.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{g.description}</p>}
                </div>
                <a
                  href={g.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
