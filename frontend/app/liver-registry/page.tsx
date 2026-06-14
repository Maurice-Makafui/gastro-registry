"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { liverRegistryApi } from "@/lib/api";
import CLDAlertBadge from "@/components/liver-registry/CLDAlertBadge";
import { User } from "@/types";
import {
  LiverRegistryRecord,
  LiverRegistryAlertSummary,
  DIAGNOSIS_LABELS,
} from "@/types/liver-registry";
import { formatDate } from "@/lib/utils";
import { Activity, AlertTriangle, Plus, RefreshCw, Droplets } from "lucide-react";
import toast from "react-hot-toast";

export default function LiverRegistryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<LiverRegistryRecord[]>([]);
  const [alerts, setAlerts] = useState<LiverRegistryAlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, alertRes] = await Promise.all([
        liverRegistryApi.list(),
        liverRegistryApi.alerts(),
      ]);
      setRecords(listRes.data);
      setAlerts(alertRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    setUser(getUser());
    loadData();
  }, [router, loadData]);

  async function handleScan() {
    setScanning(true);
    try {
      const res = await liverRegistryApi.scan();
      toast.success(
        `Scan complete: ${res.data.overdue_count} overdue, ${res.data.trend_alert_count} trend alerts`
      );
      loadData();
    } catch {
      toast.error("Risk scan failed");
    } finally {
      setScanning(false);
    }
  }

  if (!user) return null;

  const canWrite = ["ADMIN", "HEPATOLOGIST", "GASTROENTEROLOGIST", "DOCTOR"].includes(user.role);
  const canScan = ["ADMIN", "HEPATOLOGIST"].includes(user.role);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-brand-600" />
              Chronic Liver Disease Registry
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Longitudinal surveillance for high-risk liver disease cohorts
            </p>
          </div>
          <div className="flex gap-2">
            {canScan && (
              <button
                onClick={handleScan}
                disabled={scanning}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
                Run Risk Scan
              </button>
            )}
            {canWrite && (
              <button
                onClick={() => router.push("/liver-registry/new")}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Entry
              </button>
            )}
          </div>
        </div>

        {alerts && alerts.total_alerts > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-amber-900">
                {alerts.total_alerts} Active Alert{alerts.total_alerts !== 1 ? "s" : ""}
              </h2>
            </div>
            <p className="text-sm text-amber-800">
              {alerts.overdue_count} overdue reviews · {alerts.trend_alert_count} lab trend alerts
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="card p-12 text-center">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No liver registry entries yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-600">Patient</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Diagnosis</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Labs</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Next Review</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{record.patient?.full_name}</p>
                        <p className="text-xs text-slate-400">
                          {record.patient ? `${record.patient.age}y · ${record.patient.sex}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {DIAGNOSIS_LABELS[record.diagnosis]}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 space-y-0.5">
                        {record.alt != null && <p>ALT: {record.alt}</p>}
                        {record.ast != null && <p>AST: {record.ast}</p>}
                        {record.afp != null && <p>AFP: {record.afp}</p>}
                        {record.viral_load != null && <p>VL: {record.viral_load}</p>}
                        {record.fibroscan_score != null && <p>FibroScan: {record.fibroscan_score} kPa</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(record.next_review_date)}
                      </td>
                      <td className="px-4 py-3">
                        <CLDAlertBadge flag={record.risk_flag} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </main>
  );
}
