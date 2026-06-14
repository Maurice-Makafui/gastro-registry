"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { specialistsApi } from "@/lib/api";
import { User } from "@/types";
import { Specialist, SPECIALTY_LABELS } from "@/types/specialist";
import {
  ArrowLeft,
  Stethoscope,
  Building2,
  MapPin,
  Mail,
  Phone,
  Tag,
} from "lucide-react";

export default function SpecialistProfilePage() {
  const router = useRouter();
  const params = useParams();
  const specialistId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    setUser(getUser());

    if (Number.isNaN(specialistId)) {
      setError("Invalid profile ID");
      setLoading(false);
      return;
    }

    specialistsApi
      .get(specialistId)
      .then((res) => setSpecialist(res.data))
      .catch(() => setError("Specialist not found"))
      .finally(() => setLoading(false));
  }, [router, specialistId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">{error ?? "Profile not found"}</p>
        <button
          onClick={() => router.push("/directory")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to directory
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => router.push("/directory")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {specialist.user?.name ?? "Specialist"}
              </h1>
              <span className="inline-block mt-1 text-sm px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                {SPECIALTY_LABELS[specialist.specialty]}
              </span>
              {specialist.user?.department && (
                <p className="text-sm text-slate-500 mt-1">{specialist.user.department}</p>
              )}
            </div>
          </div>

          {specialist.bio && (
            <p className="mt-4 text-sm text-slate-700 leading-relaxed">{specialist.bio}</p>
          )}

          <div className="mt-5 space-y-2.5 text-sm">
            {specialist.institution && (
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{specialist.institution.facility_name}</span>
              </div>
            )}
            {specialist.institution && (
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{specialist.institution.city}, {specialist.institution.region}</span>
              </div>
            )}
            {(specialist.email || specialist.user?.email) && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{specialist.email ?? specialist.user?.email}</span>
              </div>
            )}
            {(specialist.phone || specialist.user?.phone) && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{specialist.phone ?? specialist.user?.phone}</span>
              </div>
            )}
          </div>
        </div>

        {specialist.subspecialties.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600" />
              Subspecialties
            </h2>
            <div className="flex flex-wrap gap-2">
              {specialist.subspecialties.map((sub) => (
                <span key={sub} className="text-sm px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        )}

        {specialist.interests.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Clinical Interests</h2>
            <div className="flex flex-wrap gap-2">
              {specialist.interests.map((interest) => (
                <span key={interest} className="text-sm px-3 py-1 bg-brand-50 text-brand-700 rounded-full border border-brand-100">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
    </main>
  );
}
