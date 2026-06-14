"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { referralsApi } from "@/lib/api";
import RiskBadge from "@/components/ui/RiskBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { User, Referral } from "@/types";
import { timeAgo } from "@/lib/utils";
import { Search, Filter, RefreshCw, ChevronRight, AlertCircle, Clock, CheckCircle, Users } from "lucide-react";

type FilterStatus = "ALL" | "PENDING" | "UNDER_REVIEW" | "SCHEDULED" | "COMPLETED";
type FilterRisk = "ALL" | "HIGH" | "MEDIUM" | "LOW";

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [riskFilter, setRiskFilter] = useState<FilterRisk>("ALL");

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (riskFilter !== "ALL") params.risk_level = riskFilter;
      const res = await referralsApi.list(params);
      setReferrals(res.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, riskFilter]);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (u?.role === "NURSE") { router.replace("/nurse/intake"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (user) fetchReferrals();
  }, [user, fetchReferrals]);

  const filtered = referrals.filter((r) =>
    !search ||
    r.patient?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    String(r.id).includes(search)
  );

  const stats = {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "PENDING").length,
    high: referrals.filter((r) => r.risk_level === "HIGH").length,
    completed: referrals.filter((r) => r.status === "COMPLETED").length,
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referrals Dashboard</h1>
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={fetchReferrals} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:block">Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Referrals", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "High Risk", value: stats.high, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by patient name or referral ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="input pl-8 pr-8 appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <select
              className="input"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as FilterRisk)}
            >
              <option value="ALL">All Risk</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["ID", "Patient", "Risk", "Status", "Symptoms", "Created", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/doctor/referral/${r.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">#{r.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-sm">{r.patient?.full_name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{r.patient?.age} yrs • {r.patient?.sex}</p>
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={r.risk_level} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {r.symptoms.slice(0, 2).map((s) => (
                          <span key={s} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {s.replace(/_/g, " ")}
                          </span>
                        ))}
                        {r.symptoms.length > 2 && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            +{r.symptoms.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{timeAgo(r.created_at)}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
