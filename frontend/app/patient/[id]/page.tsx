"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { patientsApi } from "@/lib/api";
import RiskBadge from "@/components/ui/RiskBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import FeedbackBadge from "@/components/referrals/FeedbackBadge";
import ReferralFeedbackPanel from "@/components/referrals/ReferralFeedbackPanel";
import { User, Patient, Referral } from "@/types";
import { FeedbackStatus } from "@/types/referral-feedback";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  User as UserIcon,
  FileText,
  Calendar,
  Phone,
  CreditCard,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function ReferralCard({
  referral,
  userRole,
}: {
  referral: Referral;
  userRole: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const feedbackStatus = (referral.feedback_status ?? "PENDING") as FeedbackStatus;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div
        className="px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-slate-400">#{referral.id}</span>
            <RiskBadge level={referral.risk_level} size="sm" />
            <StatusBadge status={referral.status} />
            <FeedbackBadge status={feedbackStatus} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{formatDateTime(referral.created_at)}</span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {referral.symptoms.slice(0, 4).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        {referral.feedback_status === "COMPLETED" && referral.recommendation_text && !expanded && (
          <p className="text-xs text-brand-700 mt-2 line-clamp-1">
            Recommendation: {referral.recommendation_text}
          </p>
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/doctor/referral/${referral.id}`);
            }}
            className="text-xs text-brand-600 hover:underline"
          >
            Open full referral view →
          </button>
          <ReferralFeedbackPanel
            referralId={referral.id}
            userRole={userRole}
            initialFeedbackStatus={feedbackStatus}
            compact={userRole === "NURSE" || userRole === "REFERRING_PHYSICIAN"}
          />
          {(userRole === "NURSE" || userRole === "REFERRING_PHYSICIAN") &&
            referral.feedback_status === "COMPLETED" && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm">
                {referral.outcome_summary && (
                  <p className="text-slate-700 mb-2"><strong>Outcome:</strong> {referral.outcome_summary}</p>
                )}
                {referral.recommendation_text && (
                  <p className="text-brand-900"><strong>Recommendation:</strong> {referral.recommendation_text}</p>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    setUser(getUser());
    patientsApi.get(parseInt(id)).then((res) => setPatient(res.data)).finally(() => setLoading(false));
  }, [id, router]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{patient.full_name}</h1>
            <p className="text-sm text-slate-500">
              {patient.age} years old · {patient.sex} · Registered {formatDate(patient.created_at)}
            </p>
          </div>
          {user.role === "NURSE" && (
            <button onClick={() => router.push("/nurse/intake")} className="btn-primary text-sm">
              + New Referral
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Demographics</h3>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Phone, label: "Phone", value: patient.phone || "Not provided" },
                  { icon: CreditCard, label: "Ghana Card", value: patient.ghana_card || "Not provided" },
                  { icon: MapPin, label: "Address", value: patient.address || "Not provided" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm text-slate-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(patient.medical_history || patient.allergies) && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-slate-900">Medical History</h3>
                </div>
                {patient.medical_history && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Past History</p>
                    <p className="text-sm text-slate-700">{patient.medical_history}</p>
                  </div>
                )}
                {patient.allergies && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-600 mb-1">⚠ Allergies</p>
                    <p className="text-sm text-red-800">{patient.allergies}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">
                  Referral History ({patient.referrals?.length ?? 0})
                </h3>
              </div>
              {!patient.referrals?.length ? (
                <div className="text-center py-10 text-slate-400 text-sm">No referrals on record</div>
              ) : (
                <div>
                  {patient.referrals!.map((r) => (
                    <ReferralCard key={r.id} referral={r} userRole={user.role} />
                  ))}
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">
                  Follow-up Schedule ({patient.followups?.length ?? 0})
                </h3>
              </div>
              {!patient.followups?.length ? (
                <div className="text-center py-10 text-slate-400 text-sm">No follow-ups scheduled</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {patient.followups!.map((f) => (
                    <div key={f.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{formatDate(f.next_visit_date)}</p>
                        {f.reason && <p className="text-xs text-slate-500 mt-0.5">{f.reason}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                        ${f.status === "COMPLETED" ? "bg-green-100 text-green-800"
                        : f.status === "MISSED" ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"}`}>
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
