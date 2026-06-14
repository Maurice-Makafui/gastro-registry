"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { proceduresApi } from "@/lib/api/procedures";
import type { Procedure, ProcedureType } from "@/types/procedure";
import { PROCEDURE_TYPE_LABELS } from "@/types/procedure";
import { formatDate } from "@/lib/utils";
import { Microscope, ArrowLeft, Plus, Search } from "lucide-react";

const TYPE_COLORS: Record<ProcedureType, string> = {
  GASTROSCOPY:   "bg-blue-100 text-blue-800",
  COLONOSCOPY:   "bg-emerald-100 text-emerald-800",
  ERCP:          "bg-purple-100 text-purple-800",
  SIGMOIDOSCOPY: "bg-teal-100 text-teal-800",
};

const FILTER_TYPES: { value: ProcedureType | ""; label: string }[] = [
  { value: "",             label: "All Types" },
  { value: "GASTROSCOPY",   label: "Gastroscopy (OGD)" },
  { value: "COLONOSCOPY",   label: "Colonoscopy" },
  { value: "ERCP",          label: "ERCP" },
  { value: "SIGMOIDOSCOPY", label: "Sigmoidoscopy" },
];

function DataTable({ records }: { records: Procedure[] }) {
  const router = useRouter();
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState<ProcedureType | "">("");

  const filtered = records.filter((r) => {
    const matchName = r.patient?.full_name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "" || r.procedure_type === typeFilter;
    return matchName && matchType;
  });

  if (records.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Microscope className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 mb-1">No endoscopy records yet</p>
        <p className="text-xs text-slate-400">
          Records appear automatically when a procedure report is saved.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by patient name…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input pl-9 py-2" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ProcedureType | "")}
          className="input py-2 w-44">
          {FILTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600">Patient</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Procedure</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Indication</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Impression</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Facility</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Doctor</th>
              <th className="px-4 py-3 font-semibold text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{r.patient?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-400">
                    {r.patient ? `${r.patient.age}y · ${r.patient.sex}` : `#${r.patient_id}`}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[r.procedure_type]}`}>
                    {PROCEDURE_TYPE_LABELS[r.procedure_type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(r.procedure_date)}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {r.indication ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {r.impression ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {r.facility?.facility_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {r.doctor?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => router.push(`/procedure/${r.id}`)}
                    className="text-xs text-brand-600 hover:underline whitespace-nowrap"
                  >
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

export default function EndoscopyRegistryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    proceduresApi.list().then((res) => setRecords(res.data)).finally(() => setLoading(false));
  }, []);

  const byType = (t: ProcedureType) => records.filter((r) => r.procedure_type === t).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/registries")}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Microscope className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Endoscopy Registry</h1>
            <p className="text-sm text-slate-500">Auto-populated from all procedure reports.</p>
          </div>
        </div>
        <button onClick={() => router.push("/doctor/procedures/new")}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus className="w-4 h-4" /> New Procedure
        </button>
      </div>

      {!loading && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["GASTROSCOPY", "COLONOSCOPY", "ERCP", "SIGMOIDOSCOPY"] as ProcedureType[]).map((t) => (
            <div key={t} className="card px-4 py-3 border-l-4 border-blue-400">
              <p className="text-xl font-bold text-slate-900">{byType(t)}</p>
              <p className="text-xs text-slate-500">{PROCEDURE_TYPE_LABELS[t]}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable records={records} />
      )}
    </div>
  );
}
