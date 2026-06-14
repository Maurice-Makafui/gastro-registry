import api from "./client";
import { ReferralFeedback, ReferralTimelineEntry } from "@/types/referral-feedback";

export const referralFeedbackApi = {
  getTimeline: (referralId: number) =>
    api.get<ReferralTimelineEntry[]>(`/referrals/${referralId}/timeline`),

  getFeedback: (referralId: number) =>
    api.get<ReferralFeedback>(`/referrals/${referralId}/feedback`),

  accept: (referralId: number, note?: string) =>
    api.post<ReferralFeedback>(`/referrals/${referralId}/feedback/accept`, { note }),

  reject: (referralId: number, note: string) =>
    api.post<ReferralFeedback>(`/referrals/${referralId}/feedback/reject`, { note }),

  complete: (
    referralId: number,
    data: { outcome_summary: string; recommendation_text: string }
  ) => api.post<ReferralFeedback>(`/referrals/${referralId}/feedback/complete`, data),
};
