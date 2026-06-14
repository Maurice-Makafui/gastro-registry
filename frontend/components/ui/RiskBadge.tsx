import { RiskLevel } from "@/types";
import { getRiskBadgeClass } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}

const icons = {
  HIGH: AlertCircle,
  MEDIUM: AlertTriangle,
  LOW: CheckCircle,
};

export default function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const Icon = icons[level];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span className={`risk-badge ${getRiskBadgeClass(level)} ${sizeClass}`}>
      <Icon className={iconSize} />
      {level}
    </span>
  );
}
