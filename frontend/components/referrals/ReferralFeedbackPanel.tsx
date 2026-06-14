"use client";
import { useEffect, useState, useCallback } from "react";
import { referralFeedbackApi } from "@/lib/api";
import { ReferralFeedback, FeedbackStatus } from "@/types/referral-feedback";
import ReferralTimeline from "./ReferralTimeline";
import FeedbackActions from "./FeedbackActions";
import RecommendationForm from "./RecommendationForm";
import FeedbackBadge from "./FeedbackBadge";
import { MessageSquare, RefreshCw } from "lucide-react";

interface ReferralFeedbackPanelProps {
  referralId: number;
  userRole: string;
  initialFeedbackStatus?: FeedbackStatus;
  compact?: boolean;
}

export default function ReferralFeedbackPanel({
  referralId,
  userRole,
  initialFeedbackStatus,
  compact = false,
}: ReferralFeedbackPanelProps) {
  const [feedback, setFeedback] = useState<ReferralFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await referralFeedbackApi.getFeedback(referralId);
      setFeedback(res.data);
    } catch {
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  }, [referralId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const status = feedback?.feedback_status ?? initialFeedbackStatus ?? "PENDING";

  return (
    <div className={compact ? "space-y-3" : "card p-5 space-y-4"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Referral Feedback Loop</h3>
          <FeedbackBadge status={status} />
        </div>
        <button
          onClick={loadFeedback}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          title="Refresh timeline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <ReferralTimeline entries={feedback?.timeline ?? []} loading={loading} />

      {!compact && (
        <>
          <FeedbackActions
            referralId={referralId}
            feedbackStatus={status}
            userRole={userRole}
            onUpdated={loadFeedback}
          />
          <RecommendationForm
            referralId={referralId}
            feedbackStatus={status}
            userRole={userRole}
            existingOutcome={feedback?.outcome_summary}
            existingRecommendation={feedback?.recommendation_text}
            onUpdated={loadFeedback}
          />
        </>
      )}
    </div>
  );
}
