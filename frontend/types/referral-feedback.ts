export type FeedbackStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
export type TimelineStatusType = "WORKFLOW" | "FEEDBACK";

export interface ReferralTimelineEntry {
  id: number;
  referral_id: number;
  actor_id: number;
  from_status?: string;
  to_status: string;
  status_type: TimelineStatusType;
  note?: string;
  created_at: string;
  actor?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface ReferralFeedback {
  referral_id: number;
  feedback_status: FeedbackStatus;
  accepted_at?: string;
  completed_at?: string;
  outcome_summary?: string;
  recommendation_text?: string;
  referring_physician_id?: number;
  timeline: ReferralTimelineEntry[];
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  PENDING: "Awaiting Specialist",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
};
