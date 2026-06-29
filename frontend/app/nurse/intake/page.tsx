"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { patientsApi, referralsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { User, SYMPTOMS_LIST } from "@/types";
import { AlertCircle, User as UserIcon, Stethoscope, Activity } from "lucide-react";
import SpecialistPicker from "@/components/referrals/SpecialistPicker";
import { Specialist } from "@/types/specialist";

const SYMPTOM_GROUPS = {
  "🔴 High Risk": SYMPTOMS_LIST.filter((s) => s.risk === "HIGH"),
  "🟡 Medium Risk": SYMPTOMS_LIST.filter((s) => s.risk === "MEDIUM"),
  "🟢 Low Risk / Routine": SYMPTOMS_LIST.filter((s) => s.risk === "LOW"),
};

export default function NurseIntakePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Patient
  const [patientData, setPatientData] = useState({
    full_name: "",
    age: "",
    sex: "MALE",
    phone: "",
    ghana_card: "",
    address: "",
    medical_history: "",
    allergies: "",
  });
  const [patientId, setPatientId] = useState<number | null>(null);

  // Step 2 - Symptoms & Vitals
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [vitals, setVitals] = useState({
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    temperature: "",
    oxygen_saturation: "",
    weight_kg: "",
  });
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [sourceFacility, setSourceFacility] = useState("");
  const [receivingSpecialist, setReceivingSpecialist] = useState<Specialist | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    if (u?.role !== "NURSE" && u?.role !== "ADMIN") {
      router.replace("/auth/login"); return;
    }
    setUser(u);
  }, [router]);

  function toggleSymptom(id: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleCreatePatient() {
    if (!patientData.full_name || !patientData.age || !patientData.sex) {
      toast.error("Name, age, and sex are required");
      return;
    }
    setLoading(true);
    try {
      const res = await patientsApi.create({
        ...patientData,
        age: parseInt(patientData.age),
      });
      setPatientId(res.data.id);
      toast.success("Patient registered");
      setStep(2);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create patient";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReferral() {
    if (selectedSymptoms.length === 0) {
      toast.error("Please select at least one symptom");
      return;
    }
    setLoading(true);
    try {
      const vitalsPayload = Object.fromEntries(
        Object.entries(vitals)
          .filter(([, v]) => v !== "")
          .map(([k, v]) => [k, parseFloat(v)])
      );

      const res = await referralsApi.create({
        patient_id: patientId,
        source_facility: sourceFacility || undefined,
        symptoms: selectedSymptoms,
        vitals: Object.keys(vitalsPayload).length > 0 ? vitalsPayload : undefined,
        chief_complaint: chiefComplaint || undefined,
        clinical_notes: clinicalNotes || undefined,
        receiving_specialist_id: receivingSpecialist?.id ?? undefined,
      });

      const risk = res.data.risk_level;
      router.push(`/nurse/triage-result?referralId=${res.data.id}&risk=${risk}`);
    } catch {
      toast.error("Failed to create referral");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "Patient Info" },
            { n: 2, label: "Symptoms & Vitals" },
            { n: 3, label: "Review" },
          ].map(({ n, label }, idx) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 shrink-0
                ${step >= n ? "bg-brand-600 border-brand-600 text-white" : "border-slate-300 text-slate-400"}`}>
                {n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step >= n ? "text-brand-700" : "text-slate-400"}`}>
                {label}
              </span>
              {idx < 2 && <div className={`flex-1 h-0.5 ${step > n ? "bg-brand-600" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Patient Info */}
        {step === 1 && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Patient Registration</h2>
                <p className="text-sm text-slate-500">Enter patient demographic details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Kofi Mensah"
                  value={patientData.full_name}
                  onChange={(e) => setPatientData({ ...patientData, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Age *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 45"
                  min={0}
                  max={150}
                  value={patientData.age}
                  onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Sex *</label>
                <select
                  className="input"
                  value={patientData.sex}
                  onChange={(e) => setPatientData({ ...patientData, sex: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  className="input"
                  placeholder="e.g. 0244123456"
                  value={patientData.phone}
                  onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Ghana Card ID</label>
                <input
                  className="input"
                  placeholder="GHA-XXXXXXXXX-X"
                  value={patientData.ghana_card}
                  onChange={(e) => setPatientData({ ...patientData, ghana_card: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input
                  className="input"
                  placeholder="e.g. Accra, Greater Accra"
                  value={patientData.address}
                  onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Relevant Medical History</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="e.g. Hypertension, Diabetes..."
                  value={patientData.medical_history}
                  onChange={(e) => setPatientData({ ...patientData, medical_history: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Known Allergies</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="e.g. Penicillin, NSAIDs..."
                  value={patientData.allergies}
                  onChange={(e) => setPatientData({ ...patientData, allergies: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button className="btn-primary" onClick={handleCreatePatient} disabled={loading}>
                {loading ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Symptoms & Vitals */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Chief complaint */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Clinical Presentation</h2>
                  <p className="text-sm text-slate-500">Chief complaint and referring facility</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Chief Complaint</label>
                  <input
                    className="input"
                    placeholder="e.g. 3-day history of vomiting blood"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Referring Facility</label>
                  <input
                    className="input"
                    placeholder="e.g. Korle Bu Polyclinic"
                    value={sourceFacility}
                    onChange={(e) => setSourceFacility(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <SpecialistPicker value={receivingSpecialist} onChange={setReceivingSpecialist} />
                </div>
              </div>
            </div>

            {/* Vitals */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Vital Signs</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { key: "systolic_bp", label: "Systolic BP", unit: "mmHg", placeholder: "120" },
                  { key: "diastolic_bp", label: "Diastolic BP", unit: "mmHg", placeholder: "80" },
                  { key: "heart_rate", label: "Heart Rate", unit: "bpm", placeholder: "72" },
                  { key: "temperature", label: "Temperature", unit: "°C", placeholder: "36.6" },
                  { key: "oxygen_saturation", label: "SpO₂", unit: "%", placeholder: "98" },
                  { key: "weight_kg", label: "Weight", unit: "kg", placeholder: "70" },
                ].map(({ key, label, unit, placeholder }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input pr-12"
                        placeholder={placeholder}
                        value={vitals[key as keyof typeof vitals]}
                        onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Symptoms checklist */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Symptoms Checklist *</h2>
                  <p className="text-sm text-slate-500">
                    Select all presenting symptoms ({selectedSymptoms.length} selected)
                  </p>
                </div>
              </div>

              {Object.entries(SYMPTOM_GROUPS).map(([group, symptoms]) => (
                <div key={group} className="mt-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {group}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {symptoms.map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                          ${selectedSymptoms.includes(s.id)
                            ? s.risk === "HIGH"
                              ? "bg-red-50 border-red-300 text-red-900"
                              : s.risk === "MEDIUM"
                              ? "bg-amber-50 border-amber-300 text-amber-900"
                              : "bg-green-50 border-green-300 text-green-900"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSymptoms.includes(s.id)}
                          onChange={() => toggleSymptom(s.id)}
                          className="rounded accent-brand-600"
                        />
                        <span className="text-sm font-medium">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Clinical Notes */}
            <div className="card p-6">
              <label className="label text-base">Additional Clinical Notes</label>
              <textarea
                className="input resize-none"
                rows={4}
                placeholder="Any additional observations, findings, or context..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="btn-primary" onClick={handleSubmitReferral} disabled={loading}>
                {loading ? "Submitting..." : "Submit Referral →"}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
