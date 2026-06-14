import { FacilityNetworkStats } from "@/types/facility";
import { MapPin } from "lucide-react";

interface FacilityMapProps {
  stats: FacilityNetworkStats;
}

const REGION_COORDS: Record<string, { x: number; y: number }> = {
  "Greater Accra": { x: 52, y: 68 },
  "Ashanti": { x: 48, y: 52 },
  "Western": { x: 28, y: 58 },
  "Central": { x: 42, y: 62 },
  "Northern": { x: 50, y: 22 },
  "Eastern": { x: 58, y: 58 },
  "Volta": { x: 62, y: 72 },
};

export default function FacilityMap({ stats }: FacilityMapProps) {
  const regions = Object.entries(stats.facilities_by_region);
  const maxCount = Math.max(...regions.map(([, count]) => count), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-brand-600" />
        Network Coverage by Region
      </h3>

      <div className="relative w-full aspect-[4/3] bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
        <svg viewBox="0 0 100 80" className="w-full h-full">
          <rect x="0" y="0" width="100" height="80" fill="#f8fafc" />
          <text x="50" y="8" textAnchor="middle" className="fill-slate-400 text-[3px]">
            Ghana — Facility Network
          </text>
          {regions.map(([region, count]) => {
            const coords = REGION_COORDS[region] ?? { x: 50, y: 40 };
            const radius = 3 + (count / maxCount) * 8;
            return (
              <g key={region}>
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={radius}
                  fill="#1e7a4e"
                  fillOpacity={0.15 + (count / maxCount) * 0.5}
                  stroke="#1e7a4e"
                  strokeWidth="0.5"
                />
                <circle cx={coords.x} cy={coords.y} r="1.5" fill="#1e7a4e" />
                <text
                  x={coords.x}
                  y={coords.y + radius + 4}
                  textAnchor="middle"
                  className="fill-slate-600 text-[2.5px] font-medium"
                >
                  {region} ({count})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {Object.entries(stats.facilities_by_type).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 rounded-lg">
            <span className="text-slate-600 capitalize">{type.toLowerCase()}</span>
            <span className="font-semibold text-slate-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
