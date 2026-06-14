"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Users, FileText, Activity, Microscope, BarChart2 } from "lucide-react";
import toast from "react-hot-toast";
import StatCard from "@/components/analytics/StatCard";
import ChartCard from "@/components/analytics/ChartCard";
import { getUser } from "@/lib/auth";
import { getAnalyticsDashboard } from "@/lib/api/analytics";
import type { AnalyticsDashboard } from "@/types/analytics";
import type { User } from "@/types";

const RISK_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};
const REGISTRY_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];
const LIVER_COLORS = ["#f97316", "#a855f7", "#14b8a6", "#f43f5e"];
const PROC_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#84cc16"];
const PROC_BAR_COLORS: Record<string, string> = {
  GASTROSCOPY: "#3b82f6",
  COLONOSCOPY: "#8b5cf6",
  ERCP: "#06b6d4",
  SIGMOIDOSCOPY: "#84cc16",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  UNDER_REVIEW: "#3b82f6",
  SCHEDULED: "#8b5cf6",
  COMPLETED: "#22c55e",
  CANCELLED: "#94a3b8",
  REFERRED_OUT: "#a855f7",
};

function SimpleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/auth/login");
      return;
    }
    setUser(u);

    getAnalyticsDashboard()
      .then(setData)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const facilityBarData = data.facility_procedure_volumes.slice(0, 8).map((f) => ({
    name: f.facility_name.length > 16 ? f.facility_name.slice(0, 16) + "…" : f.facility_name,
    GASTROSCOPY: f.GASTROSCOPY,
    COLONOSCOPY: f.COLONOSCOPY,
    ERCP: f.ERCP,
    SIGMOIDOSCOPY: f.SIGMOIDOSCOPY,
  }));

  const bottleneckData = data.referral_bottlenecks.map((b) => ({
    name: b.status.replace("_", " "),
    count: b.count,
    avg_days: b.avg_age_days,
    fill: STATUS_COLORS[b.status] ?? "#94a3b8",
  }));

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Analytics</h1>
          <p className="text-sm text-slate-500">Aggregated clinical & operational insights</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Patients" value={data.total_patients} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="Total Referrals" value={data.total_referrals} icon={FileText} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard label="Procedures Done" value={data.total_procedures} icon={Activity} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard label="Liver Records" value={data.total_liver_records} icon={Microscope} iconColor="text-teal-600" iconBg="bg-teal-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Referral Trend" subtitle="Weekly volume — last 12 weeks" className="lg:col-span-2">
          {data.referral_trend.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.referral_trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<SimpleTooltip />} />
                <Area type="monotone" dataKey="value" name="Referrals" stroke="#6366f1" strokeWidth={2} fill="url(#trendGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Risk Distribution" subtitle="All referrals">
          {data.risk_distribution.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.risk_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {data.risk_distribution.map((e) => (
                    <Cell key={e.name} fill={RISK_COLORS[e.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "Referrals"]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Facility Procedure Volumes"
        subtitle="Top 8 facilities by total procedures"
        className="mb-6"
      >
        <div>
          {facilityBarData.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No procedure data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={facilityBarData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<SimpleTooltip />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {(["GASTROSCOPY", "COLONOSCOPY", "ERCP", "SIGMOIDOSCOPY"] as const).map((pt) => (
                  <Bar
                    key={pt}
                    dataKey={pt}
                    stackId="a"
                    fill={PROC_BAR_COLORS[pt]}
                    radius={pt === "SIGMOIDOSCOPY" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Disease Burden" subtitle="Unique patients per registry">
          {data.disease_burden.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.disease_burden} dataKey="patient_count" nameKey="registry_type" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                  {data.disease_burden.map((e, i) => (
                    <Cell key={e.registry_type} fill={REGISTRY_COLORS[i % REGISTRY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "Patients"]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v) => String(v).replace(/_/g, " ")} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Liver Diagnosis Breakdown" subtitle="From CLD registry">
          {data.liver_diagnosis_breakdown.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.liver_diagnosis_breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                  {data.liver_diagnosis_breakdown.map((e, i) => (
                    <Cell key={e.name} fill={LIVER_COLORS[i % LIVER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "Records"]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Procedure Types" subtitle="Volume by type">
          {data.procedure_type_breakdown.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.procedure_type_breakdown} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={90} />
                <Tooltip formatter={(v: number) => [v, "Procedures"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.procedure_type_breakdown.map((e, i) => (
                    <Cell key={e.name} fill={PROC_COLORS[i % PROC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Referral Pipeline Bottlenecks" subtitle="Status counts and average time referrals spend at each stage">
        {bottleneckData.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Count</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Avg Age (days)</th>
                  <th className="py-2 px-3 w-48" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bottleneckData.map((row) => {
                  const maxCount = Math.max(...bottleneckData.map((r) => r.count), 1);
                  const pct = Math.round((row.count / maxCount) * 100);
                  return (
                    <tr key={row.name} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: row.fill + "22", color: row.fill }}>
                          {row.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold tabular-nums text-slate-900">{row.count}</td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-600">{row.avg_days}</td>
                      <td className="py-2.5 px-3">
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: row.fill }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </main>
  );
}

