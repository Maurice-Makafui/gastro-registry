"use client";
import { useState, useEffect, useRef } from "react";
import { specialistsApi } from "@/lib/api";
import { Specialist, Specialty, SPECIALTY_LABELS } from "@/types/specialist";
import { Search, X, UserCheck } from "lucide-react";

interface Props {
  value: Specialist | null;
  onChange: (specialist: Specialist | null) => void;
}

export default function SpecialistPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "">("");
  const [results, setResults] = useState<Specialist[]>([]);
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
    specialistsApi
      .list({ search: search || undefined, specialty: specialty || undefined, limit: 30 })
      .then((r) => setResults(r.data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [open, search, specialty]);

  function select(s: Specialist) {
    onChange(s);
    setOpen(false);
    setSearch("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div ref={ref} className="relative">
      <label className="label">Receiving Specialist (optional)</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left w-full"
      >
        {value ? (
          <span className="flex items-center gap-2 text-slate-800 text-sm">
            <UserCheck className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              <span className="font-medium">{value.user?.name}</span>
              <span className="text-slate-400 ml-1">
                · {SPECIALTY_LABELS[value.specialty]} · {value.institution?.facility_name}
              </span>
            </span>
          </span>
        ) : (
          <span className="text-slate-400 text-sm">Search and select a specialist…</span>
        )}
        {value && (
          <X className="w-4 h-4 text-slate-400 hover:text-red-500 shrink-0 ml-2" onClick={clear} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                className="input pl-9 py-2 text-sm"
                placeholder="Search by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input py-2 text-sm"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value as Specialty | "")}
            >
              <option value="">All Specialties</option>
              {(Object.keys(SPECIALTY_LABELS) as Specialty[]).map((s) => (
                <option key={s} value={s}>{SPECIALTY_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <li className="px-4 py-6 text-center">
                <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </li>
            ) : results.length === 0 ? (
              <li className="px-4 py-4 text-sm text-slate-400 text-center">No specialists found</li>
            ) : (
              results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => select(s)}
                    className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900">{s.user?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {SPECIALTY_LABELS[s.specialty]}
                      {s.subspecialties?.length > 0 && ` · ${s.subspecialties[0]}`}
                      {" · "}
                      {s.institution?.facility_name}, {s.institution?.city}
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
