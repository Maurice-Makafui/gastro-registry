"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { referralsApi } from "@/lib/api";
import type { Referral } from "@/types";
import { formatDateTime } from "@/lib/utils";
import RiskBadge from "@/components/ui/RiskBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { AlertTriangle, ArrowLeft, Search, ClipboardPlus } from "lucide-react";

// Symptoms that flag a referral as Upper GI Bleed
const UGIB_SYMPTOMS = ["haematemesis", "melaena"];

function DataTable({ records }: { records: Referral[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = records.filter((r) =>
    r.patient?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (records.length === 0) {
    return (
      <div className="card p-12 text-center">
        <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 mb-1">No Upper GI Bleeding cases found</p>
        <p className="text-xs text-slate-400">
          Cases appear automatically when a referral is submitted with haematemesis or melaena symptoms.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by patient name…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input pl-9 py-2" />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600">#</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Patient</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Symptoms</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Risk</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Chief Complaint</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
              <th className="px-4 py-3 font-semibold text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{r.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{r.patient?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-400">
                    {r.patient ? `${r.patient.age}y · ${r.patient.sex}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {r.symptoms.map((s) => (
                      <span key={s}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          UGIB_SYMPTOMS.includes(s)
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                        {s.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3"><RiskBadge level={r.risk_level} size="sm" /></td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {r.chief_complaint ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                  {formatDateTime(r.created_at)}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => router.push(`/doctor/referral/${r.id}`)}
                    className="text-xs text-brand-600 hover:underline whitespace-nowrap">
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UpperGIBleedRegistryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await referralsApi.list();
      // Filter client-side: referrals that contain any UGIB symptom
      const ugib = res.data.filter((r: Referral) =>
        r.symptoms.some((s) => UGIB_SYMPTOMS.includes(s))
      );
      setRecords(ugib);
    } finally {
      setLoading(false);
    }
  }

  const high   = records.filter((r) => r.risk_level === "HIGH").length;
  const medium = records.filter((r) => r.risk_level === "MEDIUM").length;
  const open   = records.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/registries")}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Upper GI Bleeding Registry</h1>
            <p className="text-sm text-slate-500">
              Auto-populated from referrals flagged with haematemesis or melaena.
            </p>
          </div>
        </div>
        <button onClick={() => router.push("/nurse/intake")}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <ClipboardPlus className="w-4 h-4" /> New Intake
        </button>
      </div>

      {!loading && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Cases",    value: records.length, color: "border-rose-400" },
            { label: "High Risk",      value: high,           color: "border-red-500" },
            { label: "Medium Risk",    value: medium,         color: "border-amber-400" },
            { label: "Open / Active",  value: open,           color: "border-blue-400" },
          ].map((s) => (
            <div key={s.label} className={`card px-4 py-3 border-l-4 ${s.color}`}>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable records={records} />
      )}
    </div>
  );
}
