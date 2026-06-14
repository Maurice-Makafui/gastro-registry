"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { facilitiesApi } from "@/lib/api";
import FacilityStats from "@/components/facilities/FacilityStats";
import FacilityMap from "@/components/facilities/FacilityMap";
import FacilityCard from "@/components/facilities/FacilityCard";
import { User } from "@/types";
import { Facility, FacilityNetworkStats, FacilityType } from "@/types/facility";
import { Search, Filter, Building2 } from "lucide-react";

const FACILITY_TYPES: { value: FacilityType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "CLINIC", label: "Clinic" },
  { value: "PRIVATE", label: "Private" },
];

export default function FacilitiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<FacilityNetworkStats | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [facilityType, setFacilityType] = useState<FacilityType | "">("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        facilitiesApi.stats(),
        facilitiesApi.list({
          search: search || undefined,
          region: region || undefined,
          facility_type: facilityType || undefined,
        }),
      ]);
      setStats(statsRes.data);
      setFacilities(listRes.data);
    } finally {
      setLoading(false);
    }
  }, [search, region, facilityType]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    const u = getUser();
    if (!u) {
      router.replace("/auth/login");
      return;
    }
    setUser(u);
    loadData();
  }, [router, loadData]);

  if (!user) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-600" />
              Facility Network
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Multi-facility registry across the gastroenterology association
            </p>
          </div>
        </div>

        {stats && <FacilityStats stats={stats} />}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search facilities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Region..."
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-36"
                    />
                  </div>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value as FacilityType | "")}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {FACILITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : facilities.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-card">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No facilities match your filters</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {facilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            )}
          </div>

          <div>{stats && <FacilityMap stats={stats} />}</div>
        </div>
      </main>
  );
}
