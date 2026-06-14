"use client";
import { Specialist, SPECIALTY_LABELS } from "@/types/specialist";
import { Building2, MapPin, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";

interface SpecialistCardProps {
  specialist: Specialist;
}

export default function SpecialistCard({ specialist }: SpecialistCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/directory/profile/${specialist.id}`)}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover hover:border-brand-300 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 bg-brand-50 rounded-full flex items-center justify-center group-hover:bg-brand-100 transition-colors shrink-0">
          <Stethoscope className="w-5 h-5 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm">
            {specialist.user?.name ?? "Unknown Specialist"}
          </h3>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
            {SPECIALTY_LABELS[specialist.specialty]}
          </span>
          {specialist.institution && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{specialist.institution.facility_name}</span>
            </div>
          )}
          {specialist.institution && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{specialist.institution.city}, {specialist.institution.region}</span>
            </div>
          )}
        </div>
      </div>

      {specialist.subspecialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialist.subspecialties.slice(0, 3).map((sub) => (
            <span key={sub} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {sub}
            </span>
          ))}
        </div>
      )}

      {specialist.interests.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {specialist.interests.slice(0, 4).map((interest) => (
            <span key={interest} className="text-xs px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded">
              {interest}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
