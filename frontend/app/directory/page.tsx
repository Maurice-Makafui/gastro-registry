"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { specialistsApi, facilitiesApi } from "@/lib/api";
import SpecialistCard from "@/components/directory/SpecialistCard";
import SpecialistFilters from "@/components/directory/SpecialistFilters";
import { User } from "@/types";
import { Specialist, Specialty } from "@/types/specialist";
import { Facility } from "@/types/facility";
import { Users } from "lucide-react";

export default function DirectoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "">("");
  const [institutionId, setInstitutionId] = useState<number | "">("");
  const [subspecialty, setSubspecialty] = useState("");
  const [interest, setInterest] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [specRes, facRes] = await Promise.all([
        specialistsApi.list({
          search: search || undefined,
          specialty: specialty || undefined,
          institution_id: institutionId || undefined,
          subspecialty: subspecialty || undefined,
          interest: interest || undefined,
        }),
        facilitiesApi.list(),
      ]);
      setSpecialists(specRes.data);
      setFacilities(facRes.data);
    } finally {
      setLoading(false);
    }
  }, [search, specialty, institutionId, subspecialty, interest]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    setUser(getUser());
    loadData();
  }, [router, loadData]);

  if (!user) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            Specialist Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-institutional provider lookup for the gastroenterology network
          </p>
        </div>

        <SpecialistFilters
          search={search}
          onSearchChange={setSearch}
          specialty={specialty}
          onSpecialtyChange={setSpecialty}
          institutionId={institutionId}
          onInstitutionChange={setInstitutionId}
          subspecialty={subspecialty}
          onSubspecialtyChange={setSubspecialty}
          interest={interest}
          onInterestChange={setInterest}
          facilities={facilities}
        />

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : specialists.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-card">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No specialists match your search criteria</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500">{specialists.length} specialist{specialists.length !== 1 ? "s" : ""} found</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialists.map((specialist) => (
                <SpecialistCard key={specialist.id} specialist={specialist} />
              ))}
            </div>
          </>
        )}
    </main>
  );
}
