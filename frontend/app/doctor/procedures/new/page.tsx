"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isSpecialistRole } from "@/lib/auth";
import { patientsApi, facilitiesApi, proceduresApi } from "@/lib/api";
import ProcedureTypeFields from "@/components/procedures/ProcedureTypeFields";
import { User, Patient } from "@/types";
import { Facility } from "@/types/facility";
import { ProcedureType, ProcedureTemplates, PROCEDURE_TYPE_LABELS } from "@/types/procedure";
import toast from "react-hot-toast";
import { Microscope, Plus, X } from "lucide-react";

const PROCEDURE_TYPES: ProcedureType[] = ["GASTROSCOPY", "COLONOSCOPY", "ERCP", "SIGMOIDOSCOPY"];

export default function NewProcedurePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [templates, setTemplates] = useState<ProcedureTemplates | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState<number | "">("");
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [procedureType, setProcedureType] = useState<ProcedureType>("GASTROSCOPY");
  const [procedureDate, setProcedureDate] = useState(new Date().toISOString().split("T")[0]);
  const [indication, setIndication] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    const u = getUser();
    if (!u || (!isSpecialistRole(u.role) && u.role !== "ADMIN")) {
      router.replace("/doctor/dashboard");
      return;
    }
    setUser(u);
    if (u.facility_id) setFacilityId(u.facility_id);

    Promise.all([patientsApi.list(), facilitiesApi.list()]).then(([pRes, fRes]) => {
      setPatients(pRes.data);
      setFacilities(fRes.data);
    });
  }, [router]);

  useEffect(() => {
    proceduresApi.templates(procedureType).then((res) => setTemplates(res.data));
  }, [procedureType]);

  async function handleSubmit() {
    if (!patientId || !facilityId) {
      toast.error("Please select patient and facility");
      return;
    }
    setSubmitting(true);
    try {
      const res = await proceduresApi.create({
        patient_id: Number(patientId),
        facility_id: Number(facilityId),
        procedure_type: procedureType,
        procedure_date: procedureDate,
        indication: indication || undefined,
        findings: findings || undefined,
        impression: impression || undefined,
        recommendation: recommendation || undefined,
        image_urls: imageUrls,
      });
      toast.success("Procedure report saved");
      router.push(`/procedure/${res.data.id}`);
    } catch {
      toast.error("Failed to save procedure report");
    } finally {
      setSubmitting(false);
    }
  }

  function addImageUrl() {
    if (!newImageUrl.trim()) return;
    setImageUrls([...imageUrls, newImageUrl.trim()]);
    setNewImageUrl("");
  }

  if (!user) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Microscope className="w-5 h-5 text-brand-600" />
            New Endoscopy Report
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Structured procedural reporting with type-specific templates
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Patient *</label>
              <select
                className="input"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.age}y)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Facility *</label>
              <select
                className="input"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select facility...</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facility_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Procedure Type *</label>
              <select
                className="input"
                value={procedureType}
                onChange={(e) => setProcedureType(e.target.value as ProcedureType)}
              >
                {PROCEDURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROCEDURE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Procedure Date *</label>
              <input
                type="date"
                className="input"
                value={procedureDate}
                onChange={(e) => setProcedureDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <ProcedureTypeFields
            procedureType={procedureType}
            templates={templates}
            indication={indication}
            findings={findings}
            impression={impression}
            recommendation={recommendation}
            onIndicationChange={setIndication}
            onFindingsChange={setFindings}
            onImpressionChange={setImpression}
            onRecommendationChange={setRecommendation}
          />
        </div>

        <div className="card p-6 space-y-3">
          <label className="label">Image URLs (optional)</label>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="https://example.com/endoscopy-image.jpg"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
            <button type="button" onClick={addImageUrl} className="btn-secondary shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {imageUrls.length > 0 && (
            <div className="space-y-2">
              {imageUrls.map((url, i) => (
                <div key={url} className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
                  <span className="flex-1 truncate text-slate-600">{url}</span>
                  <button
                    type="button"
                    onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving Report..." : "Save Procedure Report"}
        </button>
    </main>
  );
}
