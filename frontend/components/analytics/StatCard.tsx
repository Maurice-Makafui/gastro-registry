import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  delta?: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor, iconBg, delta }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight mb-1.5">{label}</p>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
        {delta && <p className="text-xs text-emerald-600 font-medium mt-1">{delta}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}
