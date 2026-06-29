"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isPlatformAdmin } from "@/lib/auth";
import { surveillanceApi, SurveillanceDashboard } from "@/lib/api/surveillance";
import { User } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Globe, TrendingUp, AlertCircle, Clock, CheckCircle, Building2, UserPlus } from "lucide-react";

export default function PlatformAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<SurveillanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (!isPlatformAdmin(u?.role ?? "")) { router.replace("/auth/login"); return; }
    setUser(u);
    surveillanceApi.dashboard({ weeks: 12 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpi = data?.kpis;
  const topFacilities = data?.facility_loads.slice(0, 6) ?? [];
  const facilityChartData = topFacilities.map((f) => ({
    name: f.facility_name.length > 20 ? f.facility_name.slice(0, 18) + "…" : f.facility_name,
    referrals: f.referral_count,
    procedures: f.procedure_count,
    liver: f.liver_case_count,
  }));

  const COLORS = ["#3b82f6", "#22c55e", "#8b5cf6"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-600" />
            Platform Admin
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            GASLID national operations — referral performance and data quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/admin/users")}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button
            onClick={() => router.push("/surveillance/dashboard")}
            className="btn-secondary flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Full Surveillance
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Liver Cases", value: kpi?.total_liver_cases ?? 0, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "HCC Cases", value: kpi?.total_hcc_cases ?? 0, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "GI Bleeding", value: kpi?.total_gi_bleeding_cases ?? 0, icon: AlertCircle, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Procedures", value: kpi?.total_procedures ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Refs", value: kpi?.pending_referrals ?? 0, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Missed FUPs", value: kpi?.missed_followups ?? 0, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Data quality indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Referral Performance</h3>
          <div className="space-y-3">
            {[
              { label: "Average referral delay", value: `${kpi?.avg_referral_delay_days ?? 0} days`, ok: (kpi?.avg_referral_delay_days ?? 0) < 3 },
              { label: "Endoscopy completion rate", value: `${kpi?.endoscopy_completion_rate ?? 0}%`, ok: (kpi?.endoscopy_completion_rate ?? 0) >= 80 },
              { label: "Missed follow-up rate", value: kpi?.missed_followups ?? 0, ok: (kpi?.missed_followups ?? 0) === 0 },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{value}</span>
                  <span className={`w-2 h-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Risk Flag Summary</h3>
          <div className="space-y-2">
            {Object.entries(data?.risk_flag_counts ?? {}).map(([flag, count]) => {
              const total = Object.values(data?.risk_flag_counts ?? {}).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              const color = flag === "OVERDUE" ? "bg-red-500" : flag === "TREND_ALERT" ? "bg-amber-500" : "bg-green-500";
              return (
                <div key={flag}>
                  <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                    <span>{flag.replace("_", " ")}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Facility comparison */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          Facility Comparison (Top 6)
        </h3>
        {facilityChartData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No facility data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={facilityChartData} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="referrals" name="Referrals" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
              <Bar dataKey="procedures" name="Procedures" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
              <Bar dataKey="liver" name="Liver Cases" fill={COLORS[2]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
