"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isPlatformAdmin } from "@/lib/auth";
import { surveillanceApi, SurveillanceDashboard } from "@/lib/api/surveillance";
import { User } from "@/types";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  Activity, AlertCircle, Clock, CheckCircle,
  Building2, Globe, TrendingUp, RefreshCw,
} from "lucide-react";

const DISEASE_COLORS = {
  hep_b: "#3b82f6",
  hep_c: "#f59e0b",
  cirrhosis: "#8b5cf6",
  hcc: "#ef4444",
  gi_bleeding: "#ec4899",
};

const REGION_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function SurveillanceDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<SurveillanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(12);
  const [region, setRegion] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await surveillanceApi.dashboard({
        weeks,
        region: region || undefined,
      });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [weeks, region]);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (!isPlatformAdmin(u?.role ?? "")) { router.replace("/auth/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) return null;

  const kpi = data?.kpis;
  const regions = Array.from(new Set(data?.facility_loads.map((f) => f.region) ?? [])).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-600" />
            National GI Surveillance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            GASLID — Aggregated, anonymised national intelligence. No patient identifiers.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input text-sm py-2"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          >
            {[4, 8, 12, 24, 52].map((w) => (
              <option key={w} value={w}>Last {w} weeks</option>
            ))}
          </select>
          <select
            className="input text-sm py-2"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">All Regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={load}
            className="btn-secondary flex items-center gap-2 py-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Liver Cases", value: kpi!.total_liver_cases, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "GI Bleeding", value: kpi!.total_gi_bleeding_cases, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
              { label: "HCC Cases", value: kpi!.total_hcc_cases, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Procedures", value: kpi!.total_procedures, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
              { label: "Missed Follow-ups", value: kpi!.missed_followups, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Pending Referrals", value: kpi!.pending_referrals, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Avg Referral Delay", value: `${kpi!.avg_referral_delay_days}d`, icon: Clock, color: "text-slate-600", bg: "bg-slate-100" },
              { label: "Endoscopy Rate", value: `${kpi!.endoscopy_completion_rate}%`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
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

          {/* Disease Trend */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Disease Burden Trend</h3>
            {data.disease_trend.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No trend data for selected period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.disease_trend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  {(Object.entries(DISEASE_COLORS) as [string, string][]).map(([key, color]) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key.replace("_", " ").toUpperCase()}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Facility Load + Regional Burden */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facility load */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                Facility Case Load (Top 8)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.facility_loads.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 10, bottom: 0, left: 4 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="facility_name"
                    tick={{ fontSize: 10 }}
                    width={120}
                  />
                  <Tooltip />
                  <Legend iconSize={8} />
                  <Bar dataKey="referral_count" name="Referrals" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="procedure_count" name="Procedures" fill="#22c55e" stackId="a" />
                  <Bar dataKey="liver_case_count" name="Liver Cases" fill="#8b5cf6" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Regional burden */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                Regional Disease Burden
              </h3>
              {data.regional_burden.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No regional data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.regional_burden} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <XAxis dataKey="region" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend iconSize={8} />
                    <Bar dataKey="hep_b" name="Hep B" fill={DISEASE_COLORS.hep_b} stackId="r" />
                    <Bar dataKey="hep_c" name="Hep C" fill={DISEASE_COLORS.hep_c} stackId="r" />
                    <Bar dataKey="cirrhosis" name="Cirrhosis" fill={DISEASE_COLORS.cirrhosis} stackId="r" />
                    <Bar dataKey="hcc" name="HCC" fill={DISEASE_COLORS.hcc} stackId="r" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Risk flag counts */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Liver Registry Risk Flags</h3>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(data.risk_flag_counts).map(([flag, count], i) => (
                <div key={flag} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-slate-700">{flag.replace("_", " ")}</span>
                  <span className="text-lg font-bold text-slate-900 ml-1">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Referral flows */}
          {data.referral_flows.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Top Referral Flows (Facility → Facility)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-2">From</th>
                      <th className="text-left px-4 py-2">To</th>
                      <th className="text-right px-4 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.referral_flows.map((flow, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{flow.source_facility}</td>
                        <td className="px-4 py-2 text-slate-700">{flow.target_facility}</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-700">{flow.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
