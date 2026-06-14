import { FeedbackStatus, FEEDBACK_STATUS_COLORS, FEEDBACK_STATUS_LABELS } from "@/types/referral-feedback";

interface FeedbackBadgeProps {
  status: FeedbackStatus;
  size?: "sm" | "md";
}

export default function FeedbackBadge({ status, size = "sm" }: FeedbackBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${FEEDBACK_STATUS_COLORS[status]}`}>
      {FEEDBACK_STATUS_LABELS[status]}
    </span>
  );
}
