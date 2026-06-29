"use client";
import { useState, useEffect, useRef } from "react";
import { referralsApi, facilitiesApi } from "@/lib/api";
import { Search, Building2, UserCheck, X } from "lucide-react";

export type RegistryTarget =
  | { type: "specialist"; id: number; label: string }
  | { type: "facility"; id: number; label: string };

interface Props {
  value: RegistryTarget | null;
  onChange: (target: RegistryTarget | null) => void;
  excludeSpecialistId?: number;
}

interface SpecialistResult {
  id: number;
  name: string;
  specialty: string;
  facility_name: string;
  facility_city: string;
}

interface FacilityResult {
  id: number;
  facility_name: string;
  city: string;
  region: string;
  facility_type: string;
}

export default function RegistryPicker({ value, onChange, excludeSpecialistId }: Props) {
  const [tab, setTab] = useState<"specialist" | "facility">("specialist");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [specialists, setSpecialists] = useState<SpecialistResult[]>([]);
  const [facilities, setFacilities] = useState<FacilityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    if (tab === "specialist") {
      referralsApi
        .registrySpecialists({ search: search || undefined, limit: 40 } as Record<string, string | number>)
        .then((r) => {
          const data: SpecialistResult[] = r.data.filter(
            (s: any) => s.id !== excludeSpecialistId
          );
          setSpecialists(data);
        })
        .catch(() => setSpecialists([]))
        .finally(() => setLoading(false));
    } else {
      facilitiesApi
        .list({ search: search || undefined, limit: 40 })
        .then((r) => setFacilities(r.data))
        .catch(() => setFacilities([]))
        .finally(() => setLoading(false));
    }
  }, [open, tab, search, excludeSpecialistId]);

  function selectSpecialist(s: SpecialistResult) {
    onChange({
      type: "specialist",
      id: s.id,
      label: `${s.name} — ${s.specialty} · ${s.facility_name}, ${s.facility_city}`,
    });
    setOpen(false);
    setSearch("");
  }

  function selectFacility(f: FacilityResult) {
    onChange({
      type: "facility",
      id: f.id,
      label: `${f.facility_name} (${f.facility_type}) · ${f.city}, ${f.region}`,
    });
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <label className="label">Target specialist or facility *</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left w-full"
      >
        {value ? (
          <span className="flex items-center gap-2 text-slate-800 text-sm">
            {value.type === "specialist" ? (
              <UserCheck className="w-4 h-4 text-brand-600 shrink-0" />
            ) : (
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="truncate">{value.label}</span>
          </span>
        ) : (
          <span className="text-slate-400 text-sm">Search registry…</span>
        )}
        {value && (
          <X
            className="w-4 h-4 text-slate-400 hover:text-red-500 shrink-0 ml-2"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-slate-100">
            {(["specialist", "facility"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setSearch(""); }}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                  tab === t
                    ? "text-brand-700 border-b-2 border-brand-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "specialist" ? "Specialist / Doctor" : "Facility / Clinic"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                className="input pl-9 py-2 text-sm"
                placeholder={tab === "specialist" ? "Search by name…" : "Search by facility name…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Results */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <li className="px-4 py-6 text-center">
                <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </li>
            ) : tab === "specialist" ? (
              specialists.length === 0 ? (
                <li className="px-4 py-4 text-sm text-slate-400 text-center">No specialists found</li>
              ) : (
                specialists.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectSpecialist(s)}
                      className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.specialty} · {s.facility_name}, {s.facility_city}
                      </p>
                    </button>
                  </li>
                ))
              )
            ) : facilities.length === 0 ? (
              <li className="px-4 py-4 text-sm text-slate-400 text-center">No facilities found</li>
            ) : (
              facilities.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => selectFacility(f)}
                    className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900">{f.facility_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {f.facility_type} · {f.city}, {f.region}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
