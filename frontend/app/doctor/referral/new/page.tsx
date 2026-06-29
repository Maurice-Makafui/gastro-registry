"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { referralsApi, patientsApi } from "@/lib/api";
import RegistryPicker, { RegistryTarget } from "@/components/referrals/RegistryPicker";
import { SYMPTOMS_LIST, Patient } from "@/types";
import toast from "react-hot-toast";
import { ArrowLeft, Search } from "lucide-react";

const URGENCY_OPTIONS = ["ROUTINE", "URGENT", "EMERGENCY"];

export default function NewReferralPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePatientId = searchParams.get("patient_id");

  const [user, setUser] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [target, setTarget] = useState<RegistryTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    referral_reason: "",
    chief_complaint: "",
    clinical_notes: "",
    urgency: "ROUTINE",
    symptoms: [] as string[],
    source_facility: "",
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    setUser(getUser());
    loadPatients();
  }, []);

  useEffect(() => {
    if (prePatientId && patients.length > 0) {
      const p = patients.find((x) => x.id === parseInt(prePatientId));
      if (p) setSelectedPatient(p);
    }
  }, [prePatientId, patients]);

  async function loadPatients() {
    try {
      const res = await patientsApi.list();
      setPatients(res.data);
    } catch {
      toast.error("Failed to load patients");
    }
  }

  function toggleSymptom(id: string) {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(id) ? f.symptoms.filter((s) => s !== id) : [...f.symptoms, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) { toast.error("Please select a patient"); return; }
    if (!target) { toast.error("Please select a receiving specialist or facility"); return; }
    if (form.symptoms.length === 0) { toast.error("Please select at least one symptom"); return; }
    if (!form.referral_reason.trim()) { toast.error("Referral reason is required"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        patient_id: selectedPatient.id,
        referral_reason: form.referral_reason,
        chief_complaint: form.chief_complaint || undefined,
        clinical_notes: form.clinical_notes || undefined,
        urgency: form.urgency,
        symptoms: form.symptoms,
        source_facility: form.source_facility || undefined,
        referring_physician_id: user?.id,
      };

      if (target.type === "specialist") {
        payload.receiving_specialist_id = target.id;
      } else {
        payload.receiving_facility_id = target.id;
      }

      const res = await referralsApi.create(payload);
      toast.success("Referral submitted successfully");
      router.push(`/doctor/referral/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create referral");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredPatients = patients.filter((p) =>
    !patientSearch ||
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.ghana_card ?? "").toLowerCase().includes(patientSearch.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Referral</h1>
          <p className="text-sm text-slate-500">Refer a patient to a registered specialist or facility</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient selection */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">1. Select Patient</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search patient by name or Ghana Card…"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
          </div>
          {selectedPatient ? (
            <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl p-3">
              <div>
                <p className="text-sm font-semibold text-brand-900">{selectedPatient.full_name}</p>
                <p className="text-xs text-brand-700">{selectedPatient.age} yrs · {selectedPatient.sex}</p>
              </div>
              <button type="button" onClick={() => setSelectedPatient(null)}
                className="text-xs text-slate-500 hover:text-red-500">Change</button>
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredPatients.slice(0, 20).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium text-slate-900">{p.full_name}</p>
                    <p className="text-xs text-slate-500">{p.age} yrs · {p.sex}{p.ghana_card ? ` · ${p.ghana_card}` : ""}</p>
                  </button>
                </li>
              ))}
              {filteredPatients.length === 0 && (
                <li className="px-4 py-4 text-sm text-slate-400 text-center">No patients found</li>
              )}
            </ul>
          )}
        </div>

        {/* Target selection */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">2. Select Receiving Specialist or Facility</h2>
          <RegistryPicker value={target} onChange={setTarget} />
        </div>

        {/* Clinical details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">3. Clinical Details</h2>

          <div>
            <label className="label">Referral Reason *</label>
            <textarea className="input resize-none" rows={3}
              placeholder="Clinical indication for referral…"
              value={form.referral_reason}
              onChange={(e) => setForm({ ...form, referral_reason: e.target.value })} />
          </div>

          <div>
            <label className="label">Chief Complaint</label>
            <input className="input" placeholder="Patient's main complaint"
              value={form.chief_complaint}
              onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} />
          </div>

          <div>
            <label className="label">Clinical Notes</label>
            <textarea className="input resize-none" rows={3}
              placeholder="Examination findings, history, investigations…"
              value={form.clinical_notes}
              onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Urgency</label>
              <select className="input" value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Source Facility</label>
              <input className="input" placeholder="Your current facility (optional)"
                value={form.source_facility}
                onChange={(e) => setForm({ ...form, source_facility: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Symptoms * (select all that apply)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto pr-1">
              {SYMPTOMS_LIST.map((s) => (
                <label key={s.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    form.symptoms.includes(s.id)
                      ? "bg-brand-50 border-brand-300 text-brand-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>
                  <input type="checkbox" className="accent-brand-600"
                    checked={form.symptoms.includes(s.id)}
                    onChange={() => toggleSymptom(s.id)} />
                  {s.label}
                  <span className={`ml-auto text-xs font-semibold ${
                    s.risk === "HIGH" ? "text-red-500" : s.risk === "MEDIUM" ? "text-yellow-600" : "text-green-600"
                  }`}>{s.risk}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? "Submitting referral…" : "Submit Referral"}
        </button>
      </form>
    </div>
  );
}
