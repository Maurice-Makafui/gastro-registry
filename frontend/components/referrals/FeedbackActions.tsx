"use client";
import { useState } from "react";
import { FeedbackStatus } from "@/types/referral-feedback";
import { isSpecialistRole } from "@/lib/auth";
import { referralFeedbackApi } from "@/lib/api";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface FeedbackActionsProps {
  referralId: number;
  feedbackStatus: FeedbackStatus;
  userRole: string;
  onUpdated: () => void;
}

export default function FeedbackActions({
  referralId,
  feedbackStatus,
  userRole,
  onUpdated,
}: FeedbackActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [acceptNote, setAcceptNote] = useState("");

  const canManage = isSpecialistRole(userRole) || userRole === "ADMIN";

  if (!canManage) return null;
  if (feedbackStatus !== "PENDING" && feedbackStatus !== "ACCEPTED") return null;

  async function handleAccept() {
    setLoading(true);
    try {
      await referralFeedbackApi.accept(referralId, acceptNote || undefined);
      toast.success("Referral accepted");
      onUpdated();
    } catch {
      toast.error("Failed to accept referral");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (rejectNote.trim().length < 3) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setLoading(true);
    try {
      await referralFeedbackApi.reject(referralId, rejectNote);
      toast.success("Referral rejected — referrer notified via timeline");
      setShowReject(false);
      onUpdated();
    } catch {
      toast.error("Failed to reject referral");
    } finally {
      setLoading(false);
    }
  }

  if (feedbackStatus === "PENDING") {
    return (
      <div className="space-y-3">
        <div>
          <label className="label">Acceptance note (optional)</label>
          <input
            className="input"
            placeholder="e.g. Will review within 48 hours"
            value={acceptNote}
            onChange={(e) => setAcceptNote(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Accept Referral
          </button>
          <button
            onClick={() => setShowReject(!showReject)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
        {showReject && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
            <label className="label text-red-700">Rejection reason *</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Explain why this referral cannot be accepted..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <button
              onClick={handleReject}
              disabled={loading}
              className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Rejection
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
