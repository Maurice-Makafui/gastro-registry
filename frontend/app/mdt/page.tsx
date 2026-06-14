"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { getUser } from "@/lib/auth";
import { listMDTCases, createMDTCase } from "@/lib/api/mdt";
import type { MDTCase } from "@/types/mdt";
import type { User } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  CONCLUDED: "bg-emerald-100 text-emerald-800",
};

export default function MDTBoardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<MDTCase[]>([]);
  const [tab, setTab] = useState<"ALL" | "OPEN" | "CONCLUDED">("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ patient_id: "", history_summary: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    setUser(u);
    fetchCases();
  }, []);

  async function fetchCases(statusFilter?: string) {
    setLoading(true);
    try {
      const data = await listMDTCases(statusFilter === "ALL" ? undefined : statusFilter);
      setCases(data);
    } catch {
      toast.error("Failed to load MDT cases");
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(t: "ALL" | "OPEN" | "CONCLUDED") {
    setTab(t);
    fetchCases(t === "ALL" ? undefined : t);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_id || !form.history_summary.trim()) return;
    setSubmitting(true);
    try {
      await createMDTCase({ patient_id: Number(form.patient_id), history_summary: form.history_summary });
      toast.success("MDT case submitted");
      setShowModal(false);
      setForm({ patient_id: "", history_summary: "" });
      fetchCases(tab === "ALL" ? undefined : tab);
    } catch {
      toast.error("Failed to create MDT case");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div>
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">MDT Board</h1>
              <p className="text-sm text-slate-500">Multidisciplinary team case discussions</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Case
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
          {(["ALL", "OPEN", "CONCLUDED"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading cases…</div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No MDT cases found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Submitted By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Comments</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">#{c.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.patient_name ?? `Patient #${c.patient_id}`}</td>
                    <td className="px-4 py-3 text-slate-600">{c.submitted_by_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.discussion_status]}`}>
                        {c.discussion_status === "OPEN" ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {c.discussion_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-500">
                        <MessageSquare className="w-3.5 h-3.5" /> {c.comment_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/mdt/${c.id}`)}
                        className="text-violet-600 hover:text-violet-800 font-medium text-xs"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* New Case Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            <h2 className="text-lg font-bold text-slate-900 mb-4">Submit MDT Case</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID</label>
                <input
                  type="number"
                  required
                  value={form.patient_id}
                  onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Enter patient ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">History & Clinical Summary</label>
                <textarea
                  required
                  rows={5}
                  value={form.history_summary}
                  onChange={(e) => setForm((f) => ({ ...f, history_summary: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Provide relevant history, investigations, and the clinical question for the team…"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


