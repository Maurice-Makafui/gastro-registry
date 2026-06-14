import { LiverRiskFlag, RISK_FLAG_COLORS, RISK_FLAG_LABELS } from "@/types/liver-registry";

interface CLDAlertBadgeProps {
  flag: LiverRiskFlag;
  size?: "sm" | "md";
}

export default function CLDAlertBadge({ flag, size = "sm" }: CLDAlertBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${RISK_FLAG_COLORS[flag]}`}>
      {RISK_FLAG_LABELS[flag]}
    </span>
  );
}
