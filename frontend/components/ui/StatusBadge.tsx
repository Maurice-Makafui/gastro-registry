import { ReferralStatus } from "@/types";
import { getStatusBadgeClass } from "@/lib/utils";

interface StatusBadgeProps {
  status: ReferralStatus;
}

const labels: Record<ReferralStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFERRED_OUT: "Referred Out",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getStatusBadgeClass(status)}`}>
      {labels[status] ?? status}
    </span>
  );
}
