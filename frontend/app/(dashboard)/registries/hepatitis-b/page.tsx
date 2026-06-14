"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { liverRegistryApi } from "@/lib/api/liver-registry";
import type { LiverRegistryRecord, LiverRiskFlag } from "@/types/liver-registry";
import { RISK_FLAG_COLORS, RISK_FLAG_LABELS } from "@/types/liver-registry";
import { formatDate } from "@/lib/utils";
import {
  Droplets,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Plus,
  Search,
} from "lucide-react";

// ── Risk badge ────────────────────────────────────────────────────────────────

function RiskFlagBadge({ flag }: { flag: LiverRiskFlag }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${RISK_FLAG_COLORS[flag]}`}
    >
      {flag !== "NORMAL" && <AlertTriangle className="w-3 h-3" />}
      {RISK_FLAG_LABELS[flag]}
    </span>
  );
}

// ── Data table ────────────────────────────────────────────────────────────────

function HepBDataTable({ records }: { records: LiverRegistryRecord[] }) {
  const [search, setSearch] = useState("");

  const filtered = records.filter((r) =>
    r.patient?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (records.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Droplets className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 mb-1">No Hepatitis B records yet</p>
        <p className="text-xs text-slate-400">
          Records appear automatically when a liver registry entry is saved with diagnosis &quot;Hepatitis B&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2"
          />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Patient</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Age / Sex</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Viral Load</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">ALT</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">AST</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">FibroScan</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">AFP</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Next Review</th>
              <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{r.patient?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-400">#{r.patient_id}</p>
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {r.patient ? `${r.patient.age}y · ${r.patient.sex}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.viral_load != null ? r.viral_load.toLocaleString() : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.alt != null ? r.alt : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.ast != null ? r.ast : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.fibroscan_score != null ? `${r.fibroscan_score} kPa` : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.afp != null ? r.afp : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {formatDate(r.next_review_date)}
                </td>
                <td className="px-4 py-3">
                  <RiskFlagBadge flag={r.risk_flag} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`card px-4 py-3 flex items-center gap-3 border-l-4 ${color}`}>
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HepatitisBRegistryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<LiverRegistryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await liverRegistryApi.list({ diagnosis: "HEP_B" });
      setRecords(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    try {
      await liverRegistryApi.scan();
      await load();
    } finally {
      setScanning(false);
    }
  }

  const overdue      = records.filter((r) => r.risk_flag === "OVERDUE").length;
  const trendAlerts  = records.filter((r) => r.risk_flag === "TREND_ALERT").length;
  const onTrack      = records.filter((r) => r.risk_flag === "NORMAL").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/registries")}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Droplets className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Hepatitis B Registry</h1>
            <p className="text-sm text-slate-500">
              Auto-populated from liver registry entries — no duplicate data entry required.
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            Run Risk Scan
          </button>
          <button
            onClick={() => router.push("/liver-registry/new")}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Total Patients"  value={records.length} color="border-amber-400" />
          <StatPill label="On Track"        value={onTrack}        color="border-emerald-400" />
          <StatPill label="Reviews Overdue" value={overdue}        color="border-red-400" />
          <StatPill label="Trend Alerts"    value={trendAlerts}    color="border-orange-400" />
        </div>
      )}

      {/* Alert banner */}
      {(overdue > 0 || trendAlerts > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900">
            <strong>{overdue + trendAlerts} patient{overdue + trendAlerts !== 1 ? "s" : ""}</strong> require
            attention — {overdue} overdue review{overdue !== 1 ? "s" : ""}, {trendAlerts} lab trend alert{trendAlerts !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Data table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <HepBDataTable records={records} />
      )}
    </div>
  );
}
