import { FacilityNetworkStats } from "@/types/facility";
import { Building2, Users, FileText, Activity } from "lucide-react";

interface FacilityStatsProps {
  stats: FacilityNetworkStats;
}

export default function FacilityStats({ stats }: FacilityStatsProps) {
  const cards = [
    {
      label: "Total Facilities",
      value: stats.total_facilities,
      sub: `${stats.active_facilities} active`,
      icon: Building2,
      color: "text-brand-600 bg-brand-50",
    },
    {
      label: "Specialists",
      value: stats.total_specialists,
      sub: "Across network",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Referrals",
      value: stats.total_referrals,
      sub: "All time",
      icon: FileText,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Regions",
      value: Object.keys(stats.facilities_by_region).length,
      sub: "Coverage areas",
      icon: Activity,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-card"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">{card.label}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
