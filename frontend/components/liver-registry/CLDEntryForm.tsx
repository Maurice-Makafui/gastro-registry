"use client";
import { LiverDiagnosis, DIAGNOSIS_LABELS } from "@/types/liver-registry";
import { Patient } from "@/types";
import { Facility } from "@/types/facility";

export interface CLDFormData {
  patient_id: number | "";
  facility_id: number | "";
  diagnosis: LiverDiagnosis | "";
  fibroscan_score: string;
  viral_load: string;
  afp: string;
  alt: string;
  ast: string;
  ultrasound_date: string;
  next_review_date: string;
}

interface CLDEntryFormProps {
  patients: Patient[];
  facilities: Facility[];
  data: CLDFormData;
  onChange: (data: CLDFormData) => void;
  submitting?: boolean;
  onSubmit: () => void;
}

const DIAGNOSES: LiverDiagnosis[] = ["HEP_B", "HEP_C", "CIRRHOSIS", "HCC"];

export default function CLDEntryForm({
  patients,
  facilities,
  data,
  onChange,
  submitting,
  onSubmit,
}: CLDEntryFormProps) {
  function update<K extends keyof CLDFormData>(key: K, value: CLDFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  const showViralLoad = data.diagnosis === "HEP_B" || data.diagnosis === "HEP_C";
  const showFibroscan = data.diagnosis === "CIRRHOSIS" || data.diagnosis === "HCC";

  return (
    <div className="card p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Patient *</label>
          <select
            className="input"
            value={data.patient_id}
            onChange={(e) => update("patient_id", e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select patient...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.age}y, {p.sex})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Facility *</label>
          <select
            className="input"
            value={data.facility_id}
            onChange={(e) => update("facility_id", e.target.value ? Number(e.target.value) : "")}
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

      <div>
        <label className="label">Diagnosis *</label>
        <select
          className="input"
          value={data.diagnosis}
          onChange={(e) => update("diagnosis", e.target.value as LiverDiagnosis | "")}
        >
          <option value="">Select diagnosis...</option>
          {DIAGNOSES.map((d) => (
            <option key={d} value={d}>
              {DIAGNOSIS_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {showFibroscan && (
          <div>
            <label className="label">FibroScan (kPa)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="75"
              className="input"
              value={data.fibroscan_score}
              onChange={(e) => update("fibroscan_score", e.target.value)}
            />
          </div>
        )}
        {showViralLoad && (
          <div>
            <label className="label">Viral Load (IU/mL)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={data.viral_load}
              onChange={(e) => update("viral_load", e.target.value)}
            />
          </div>
        )}
        <div>
          <label className="label">AFP (ng/mL)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={data.afp}
            onChange={(e) => update("afp", e.target.value)}
          />
        </div>
        <div>
          <label className="label">ALT (U/L)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={data.alt}
            onChange={(e) => update("alt", e.target.value)}
          />
        </div>
        <div>
          <label className="label">AST (U/L)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={data.ast}
            onChange={(e) => update("ast", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ultrasound Date</label>
          <input
            type="date"
            className="input"
            value={data.ultrasound_date}
            onChange={(e) => update("ultrasound_date", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Next Review Date *</label>
          <input
            type="date"
            className="input"
            value={data.next_review_date}
            onChange={(e) => update("next_review_date", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? "Saving..." : "Save Registry Entry"}
      </button>
    </div>
  );
}
