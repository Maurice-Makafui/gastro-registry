"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { referralsApi, proceduresApi } from "@/lib/api";
import type { Referral } from "@/types";
import type { Procedure } from "@/types/procedure";
import { formatDateTime, formatDate } from "@/lib/utils";
import RiskBadge from "@/components/ui/RiskBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { Ribbon, ArrowLeft, Search, ClipboardPlus } from "lucide-react";

const CRC_SYMPTOMS = ["rectal_bleeding", "weight_loss", "change_in_bowel_habit"];

type ActiveTab = "referrals" | "colonoscopies";

export default function ColorectalCancerRegistryPage() {
  const router = useRouter();
  const [referrals, setReferrals]       = useState<Referral[]>([]);
  const [colonoscopies, setColonoscopies] = useState<Procedure[]>([]);
  const [loading, setLoading]            = useState(true);
  const [tab, setTab]                    = useState<ActiveTab>("referrals");
  const [search, setSearch]              = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [refRes, procRes] = await Promise.all([
        referralsApi.list(),
        proceduresApi.list({ procedure_type: "COLONOSCOPY" }),
      ]);
      setReferrals(
        refRes.data.filter((r: Referral) =>
          r.symptoms.some((s) => CRC_SYMPTOMS.includes(s))
        )
      );
      setColonoscopies(procRes.data);
    } finally {
      setLoading(false);
    }
  }

  const filteredReferrals = referrals.filter((r) =>
    r.patient?.full_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProcs = colonoscopies.filter((r) =>
    r.patient?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/registries")}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Ribbon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Colorectal Cancer Registry</h1>
            <p className="text-sm text-slate-500">
              Auto-populated from referrals with CRC symptoms and all colonoscopy reports.
            </p>
          </div>
        </div>
        <button onClick={() => router.push("/nurse/intake")}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <ClipboardPlus className="w-4 h-4" /> New Intake
        </button>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Symptomatic Referrals", value: referrals.length,     color: "border-purple-400" },
            { label: "Colonoscopies",          value: colonoscopies.length, color: "border-emerald-400" },
            { label: "High Risk Referrals",    value: referrals.filter((r) => r.risk_level === "HIGH").length, color: "border-red-400" },
          ].map((s) => (
            <div key={s.label} className={`card px-4 py-3 border-l-4 ${s.color}`}>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab switcher + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {(["referrals", "colonoscopies"] as ActiveTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by patient name…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input pl-9 py-2" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "referrals" ? (
        /* ── Referrals table ── */
        <div className="card overflow-hidden">
          {filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <Ribbon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No CRC-flagged referrals found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-600">#</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Patient</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Symptoms</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Risk</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReferrals.map((r) => (
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
                                CRC_SYMPTOMS.includes(s)
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                              {s.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><RiskBadge level={r.risk_level} size="sm" /></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
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
          )}
        </div>
      ) : (
        /* ── Colonoscopies table ── */
        <div className="card overflow-hidden">
          {filteredProcs.length === 0 ? (
            <div className="p-12 text-center">
              <Ribbon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No colonoscopy reports found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-600">Patient</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Indication</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Impression</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Doctor</th>
                    <th className="px-4 py-3 font-semibold text-slate-600" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProcs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.patient?.full_name ?? "—"}</p>
                        <p className="text-xs text-slate-400">
                          {r.patient ? `${r.patient.age}y · ${r.patient.sex}` : `#${r.patient_id}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(r.procedure_date)}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {r.indication ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {r.impression ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.doctor?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => router.push(`/procedure/${r.id}`)}
                          className="text-xs text-brand-600 hover:underline whitespace-nowrap">
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
