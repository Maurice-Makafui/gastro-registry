"use client";
import { useState } from "react";
import { referralsApi } from "@/lib/api";
import { Referral } from "@/types";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, ArrowRightCircle, Flag, Loader2 } from "lucide-react";
import RegistryPicker, { RegistryTarget } from "./RegistryPicker";

interface Props {
  referral: Referral;
  currentUserId: number;
  currentUserRole: string;
  specialistId?: number; // logged-in user's specialist profile id (if any)
  onUpdated: () => void;
}

export default function ReferralActions({
  referral,
  currentUserId,
  currentUserRole,
  specialistId,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showReferOn, setShowReferOn] = useState(false);
  const [referOnTarget, setReferOnTarget] = useState<RegistryTarget | null>(null);
  const [referOnReason, setReferOnReason] = useState("");

  const isAdmin = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(currentUserRole);
  const isClinician = ["DOCTOR", "GASTROENTEROLOGIST", "HEPATOLOGIST", "REFERRING_PHYSICIAN"].includes(currentUserRole);

  // Is this user the assigned recipient?
  const isAssignedSpecialist = specialistId != null && referral.receiving_specialist_id === specialistId;
  const isAssignedDoctor = referral.assigned_doctor_id === currentUserId;
  const canAct = isAssignedSpecialist || isAssignedDoctor || isAdmin;

  const status = referral.status;

  async function handleAccept() {
    setLoading(true);
    try {
      await referralsApi.accept(referral.id);
      toast.success("Referral accepted");
      onUpdated();
    } catch {
      toast.error("Failed to accept referral");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (declineReason.trim().length < 3) {
      toast.error("Please provide a decline reason (min 3 characters)");
      return;
    }
    setLoading(true);
    try {
      await referralsApi.decline(referral.id, declineReason.trim());
      toast.success("Referral declined");
      setShowDecline(false);
      onUpdated();
    } catch {
      toast.error("Failed to decline referral");
    } finally {
      setLoading(false);
    }
  }

  async function handleReferOn() {
    if (!referOnTarget) {
      toast.error("Please select a target specialist or facility");
      return;
    }
    setLoading(true);
    try {
      await referralsApi.referOn(referral.id, {
        receiving_specialist_id: referOnTarget.type === "specialist" ? referOnTarget.id : undefined,
        receiving_facility_id: referOnTarget.type === "facility" ? referOnTarget.id : undefined,
        referral_reason: referOnReason || undefined,
      });
      toast.success("Referral referred onward");
      setShowReferOn(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to refer onward");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    try {
      await referralsApi.complete(referral.id);
      toast.success("Referral marked as completed");
      onUpdated();
    } catch {
      toast.error("Failed to complete referral");
    } finally {
      setLoading(false);
    }
  }

  // Determine which buttons are available
  const canAccept = canAct && ["PENDING", "SUBMITTED", "ASSIGNED", "REFERRED_ON", "REFERRED_OUT"].includes(status);
  const canDecline = canAct && ["PENDING", "SUBMITTED", "ASSIGNED", "REFERRED_ON", "REFERRED_OUT"].includes(status);
  const canReferOn = (canAct || isClinician) && ["ACCEPTED", "PENDING", "SUBMITTED"].includes(status);
  const canComplete = canAct && status === "ACCEPTED";

  if (!canAccept && !canDecline && !canReferOn && !canComplete) return null;

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-slate-900 text-sm">Referral Actions</h3>

      {/* Primary action buttons */}
      <div className="flex flex-wrap gap-2">
        {canAccept && (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Accept
          </button>
        )}
        {canDecline && (
          <button
            onClick={() => setShowDecline(!showDecline)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Decline
          </button>
        )}
        {canReferOn && (
          <button
            onClick={() => setShowReferOn(!showReferOn)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowRightCircle className="w-4 h-4" />
            Refer Onward
          </button>
        )}
        {canComplete && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Flag className="w-4 h-4" />
            Mark Complete
          </button>
        )}
      </div>

      {/* Decline form */}
      {showDecline && (
        <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
          <p className="text-sm font-semibold text-red-700">Decline reason *</p>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Explain why this referral is being declined..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Declining..." : "Confirm Decline"}
            </button>
            <button
              onClick={() => setShowDecline(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Refer onward form */}
      {showReferOn && (
        <div className="border border-brand-200 rounded-xl p-4 bg-brand-50 space-y-3">
          <p className="text-sm font-semibold text-brand-700">Refer onward to registry provider</p>
          <RegistryPicker value={referOnTarget} onChange={setReferOnTarget} excludeSpecialistId={specialistId} />
          <div>
            <label className="label">Reason / notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Why are you referring onward?"
              value={referOnReason}
              onChange={(e) => setReferOnReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReferOn}
              disabled={loading || !referOnTarget}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Referring..." : "Confirm Refer Onward"}
            </button>
            <button
              onClick={() => setShowReferOn(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
