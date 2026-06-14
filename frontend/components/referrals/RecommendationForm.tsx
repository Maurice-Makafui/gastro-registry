"use client";
import { useState } from "react";
import { FeedbackStatus } from "@/types/referral-feedback";
import { isSpecialistRole } from "@/lib/auth";
import { referralFeedbackApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Send, Loader2 } from "lucide-react";

interface RecommendationFormProps {
  referralId: number;
  feedbackStatus: FeedbackStatus;
  userRole: string;
  existingOutcome?: string;
  existingRecommendation?: string;
  onUpdated: () => void;
}

export default function RecommendationForm({
  referralId,
  feedbackStatus,
  userRole,
  existingOutcome,
  existingRecommendation,
  onUpdated,
}: RecommendationFormProps) {
  const [loading, setLoading] = useState(false);
  const [outcomeSummary, setOutcomeSummary] = useState(existingOutcome ?? "");
  const [recommendationText, setRecommendationText] = useState(existingRecommendation ?? "");

  const canComplete =
    (isSpecialistRole(userRole) || userRole === "ADMIN") && feedbackStatus === "ACCEPTED";

  if (feedbackStatus === "COMPLETED" && existingOutcome) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-800 mb-2">Outcome Summary</h4>
          <p className="text-sm text-green-900">{existingOutcome}</p>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-brand-800 mb-2">Recommendation to Referrer</h4>
          <p className="text-sm text-brand-900">{existingRecommendation}</p>
        </div>
      </div>
    );
  }

  if (!canComplete) return null;

  async function handleSubmit() {
    if (outcomeSummary.trim().length < 3 || recommendationText.trim().length < 3) {
      toast.error("Please complete both outcome and recommendation fields");
      return;
    }
    setLoading(true);
    try {
      await referralFeedbackApi.complete(referralId, {
        outcome_summary: outcomeSummary,
        recommendation_text: recommendationText,
      });
      toast.success("Recommendation sent to referring physician");
      onUpdated();
    } catch {
      toast.error("Failed to submit recommendation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <h4 className="text-sm font-semibold text-slate-900">Issue Final Recommendation</h4>
      <div>
        <label className="label">Outcome Summary *</label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Summarise clinical outcome, findings, and disposition..."
          value={outcomeSummary}
          onChange={(e) => setOutcomeSummary(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Recommendation to Referring MD *</label>
        <textarea
          className="input resize-none"
          rows={4}
          placeholder="Management advice, follow-up plan, medications, red flags..."
          value={recommendationText}
          onChange={(e) => setRecommendationText(e.target.value)}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        Send Recommendation to Referrer
      </button>
    </div>
  );
}
