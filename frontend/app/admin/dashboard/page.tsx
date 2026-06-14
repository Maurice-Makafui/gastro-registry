"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { analyticsApi } from "@/lib/api";
import RiskBadge from "@/components/ui/RiskBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { User, AnalyticsSummary } from "@/types";
import { timeAgo } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, FileText, AlertCircle, CheckCircle,
  Clock, TrendingUp, Calendar, Activity
} from "lucide-react";

const RISK_COLORS = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308", UNDER_REVIEW: "#3b82f6", SCHEDULED: "#8b5cf6",
  COMPLETED: "#22c55e", CANCELLED: "#94a3b8", REFERRED_OUT: "#a855f7",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (u?.role === "NURSE") { router.replace("/nurse/intake"); return; }
    setUser(u);
    analyticsApi.summary().then((res) => {
      setSummary(res.data);
    }).finally(() => setLoading(false));
  }, [router]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = summary!;
  const riskChartData = Object.entries(s.referrals_by_risk).map(([name, value]) => ({ name, value }));
  const statusChartData = Object.entries(s.referrals_by_status)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace("_", " "), value }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-500 text-sm">System-wide overview — Gastro Referral Registry</p>
      </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Patients", value: s.total_patients, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Total Referrals", value: s.total_referrals, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "High Risk", value: s.high_risk_referrals, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
            { label: "Today's Referrals", value: s.referrals_today, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Pending Review", value: s.pending_referrals, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Completed", value: s.completed_referrals, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Upcoming Follow-ups", value: s.upcoming_followups, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Medium Risk", value: s.medium_risk_referrals, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium leading-tight mb-2">{label}</p>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk distribution */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Risk Level Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={riskChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {riskChartData.map((entry) => (
                    <Cell key={entry.name} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || "#94a3b8"} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status breakdown */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Referrals by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name.replace(" ", "_")] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent referrals */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Referrals</h3>
            <button
              onClick={() => router.push("/doctor/dashboard")}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["ID", "Patient", "Risk", "Status", "Age", "When"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.recent_referrals.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/doctor/referral/${r.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-slate-400">#{r.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {r.patient?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={r.risk_level} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.patient?.age ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
