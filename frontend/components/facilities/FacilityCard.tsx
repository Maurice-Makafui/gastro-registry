import { Facility, FACILITY_TYPE_COLORS, FACILITY_TYPE_LABELS } from "@/types/facility";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface FacilityCardProps {
  facility: Facility;
}

export default function FacilityCard({ facility }: FacilityCardProps) {
  const router = useRouter();
  const typeClass = FACILITY_TYPE_COLORS[facility.facility_type];

  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/facilities/${facility.id}`)}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all hover:border-brand-300 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
            <Building2 className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm leading-tight">
              {facility.facility_name}
            </h3>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${typeClass}`}>
              {FACILITY_TYPE_LABELS[facility.facility_type]}
            </span>
          </div>
        </div>
        {!facility.is_active && (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">Inactive</span>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{facility.city}, {facility.region}</span>
        </div>
        {facility.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{facility.phone}</span>
          </div>
        )}
        {facility.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{facility.email}</span>
          </div>
        )}
      </div>
    </button>
  );
}
