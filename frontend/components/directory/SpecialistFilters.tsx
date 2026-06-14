"use client";
import { Specialty, SPECIALTY_LABELS, COMMON_SUBSPECIALTIES, COMMON_INTERESTS } from "@/types/specialist";
import { Facility } from "@/types/facility";
import { Search, Filter, X } from "lucide-react";

interface SpecialistFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  specialty: Specialty | "";
  onSpecialtyChange: (value: Specialty | "") => void;
  institutionId: number | "";
  onInstitutionChange: (value: number | "") => void;
  subspecialty: string;
  onSubspecialtyChange: (value: string) => void;
  interest: string;
  onInterestChange: (value: string) => void;
  facilities: Facility[];
}

const SPECIALTIES: { value: Specialty | ""; label: string }[] = [
  { value: "", label: "All Specialties" },
  { value: "GASTROENTEROLOGY", label: "Gastroenterology" },
  { value: "HEPATOLOGY", label: "Hepatology" },
  { value: "GI_SURGERY", label: "GI Surgery" },
];

export default function SpecialistFilters({
  search,
  onSearchChange,
  specialty,
  onSpecialtyChange,
  institutionId,
  onInstitutionChange,
  subspecialty,
  onSubspecialtyChange,
  interest,
  onInterestChange,
  facilities,
}: SpecialistFiltersProps) {
  const hasFilters = specialty || institutionId || subspecialty || interest || search;

  function clearFilters() {
    onSearchChange("");
    onSpecialtyChange("");
    onInstitutionChange("");
    onSubspecialtyChange("");
    onInterestChange("");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, bio, or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Specialty
          </label>
          <select
            value={specialty}
            onChange={(e) => onSpecialtyChange(e.target.value as Specialty | "")}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SPECIALTIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Facility</label>
          <select
            value={institutionId}
            onChange={(e) => onInstitutionChange(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.facility_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Subspecialty</label>
          <select
            value={subspecialty}
            onChange={(e) => onSubspecialtyChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Any Subspecialty</option>
            {COMMON_SUBSPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Clinical Interest</label>
          <select
            value={interest}
            onChange={(e) => onInterestChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Any Interest</option>
            {COMMON_INTERESTS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear all filters
        </button>
      )}

      {specialty && (
        <p className="text-xs text-slate-400">
          Showing {SPECIALTY_LABELS[specialty as Specialty]} specialists
        </p>
      )}
    </div>
  );
}
