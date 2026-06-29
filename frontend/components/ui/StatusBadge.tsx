import { ReferralStatus } from "@/types";
import { getStatusBadgeClass } from "@/lib/utils";

interface StatusBadgeProps {
  status: ReferralStatus;
}

const labels: Record<ReferralStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  SCHEDULED: "Scheduled",
  DECLINED: "Declined",
  REFERRED_ON: "Referred On",
  REFERRED_OUT: "Referred Out",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getStatusBadgeClass(status)}`}>
      {labels[status] ?? status}
    </span>
  );
}
