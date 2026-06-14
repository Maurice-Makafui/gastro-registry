"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isSpecialistRole } from "@/lib/auth";
import { patientsApi, facilitiesApi, liverRegistryApi } from "@/lib/api";
import CLDEntryForm, { CLDFormData } from "@/components/liver-registry/CLDEntryForm";
import { User, Patient } from "@/types";
import { Facility } from "@/types/facility";
import toast from "react-hot-toast";
import { ArrowLeft, Droplets } from "lucide-react";

const emptyForm = (): CLDFormData => ({
  patient_id: "",
  facility_id: "",
  diagnosis: "",
  fibroscan_score: "",
  viral_load: "",
  afp: "",
  alt: "",
  ast: "",
  ultrasound_date: "",
  next_review_date: "",
});

export default function NewLiverRegistryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [formData, setFormData] = useState<CLDFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    const u = getUser();
    if (!u || (!isSpecialistRole(u.role) && u.role !== "ADMIN")) {
      router.replace("/liver-registry");
      return;
    }
    setUser(u);
    if (u.facility_id) {
      setFormData((prev) => ({ ...prev, facility_id: u.facility_id! }));
    }

    Promise.all([patientsApi.list(), facilitiesApi.list()]).then(([pRes, fRes]) => {
      setPatients(pRes.data);
      setFacilities(fRes.data);
    });
  }, [router]);

  async function handleSubmit() {
    if (!formData.patient_id || !formData.facility_id || !formData.diagnosis || !formData.next_review_date) {
      toast.error("Please complete all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await liverRegistryApi.create({
        patient_id: Number(formData.patient_id),
        facility_id: Number(formData.facility_id),
        diagnosis: formData.diagnosis,
        fibroscan_score: formData.fibroscan_score ? Number(formData.fibroscan_score) : undefined,
        viral_load: formData.viral_load ? Number(formData.viral_load) : undefined,
        afp: formData.afp ? Number(formData.afp) : undefined,
        alt: formData.alt ? Number(formData.alt) : undefined,
        ast: formData.ast ? Number(formData.ast) : undefined,
        ultrasound_date: formData.ultrasound_date || undefined,
        next_review_date: formData.next_review_date,
      });
      toast.success("Liver registry entry saved");
      router.push("/liver-registry");
    } catch {
      toast.error("Failed to save registry entry");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => router.push("/liver-registry")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Registry
        </button>

        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-brand-600" />
            New CLD Registry Entry
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record surveillance labs and schedule next review
          </p>
        </div>

        <CLDEntryForm
          patients={patients}
          facilities={facilities}
          data={formData}
          onChange={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
    </main>
  );
}
