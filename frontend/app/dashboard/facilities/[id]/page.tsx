"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { facilitiesApi } from "@/lib/api";
import { User } from "@/types";
import {
  FacilityDetail,
  FACILITY_TYPE_COLORS,
  FACILITY_TYPE_LABELS,
} from "@/types/facility";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  FileText,
  Stethoscope,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function FacilityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const facilityId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (Number.isNaN(facilityId)) {
      setError("Invalid facility ID");
      setLoading(false);
      return;
    }

    facilitiesApi
      .get(facilityId)
      .then((res) => setFacility(res.data))
      .catch(() => setError("Facility not found"))
      .finally(() => setLoading(false));
  }, [router, facilityId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">{error ?? "Facility not found"}</p>
        <button
          onClick={() => router.push("/dashboard/facilities")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to facilities
        </button>
      </div>
    );
  }

  const typeClass = FACILITY_TYPE_COLORS[facility.facility_type];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => router.push("/dashboard/facilities")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Network
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{facility.facility_name}</h1>
                <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${typeClass}`}>
                  {FACILITY_TYPE_LABELS[facility.facility_type]}
                </span>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {facility.city}, {facility.region}
                  </div>
                  {facility.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {facility.phone}
                    </div>
                  )}
                  {facility.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {facility.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-slate-900">{facility.specialist_count}</p>
                <p className="text-xs text-slate-500">Specialists</p>
              </div>
              <div className="text-center px-4 py-2 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-slate-900">{facility.referral_count}</p>
                <p className="text-xs text-slate-500">Referrals</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Registered {formatDate(facility.created_at)}
            {!facility.is_active && " · Currently inactive"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-brand-600" />
              Active Specialist Roster
            </h2>
          </div>

          {facility.roster.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No specialists registered at this facility</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {facility.roster.map((member) => (
                <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                    {member.department && (
                      <p className="text-xs text-slate-400 mt-0.5">{member.department}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    {member.role.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
    </main>
  );
}
