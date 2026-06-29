"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated, getUser, isSpecialistRole } from "@/lib/auth";
import { referralsApi, doctorApi, followupsApi, specialistsApi } from "@/lib/api";
import RiskBadge from "@/components/ui/RiskBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import FeedbackBadge from "@/components/referrals/FeedbackBadge";
import ReferralFeedbackPanel from "@/components/referrals/ReferralFeedbackPanel";
import ReferralActions from "@/components/referrals/ReferralActions";
import { User, Referral, Consultation } from "@/types";
import { FeedbackStatus } from "@/types/referral-feedback";
import { Specialist } from "@/types/specialist";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ArrowLeft, User as UserIcon, Stethoscope, ClipboardList,
  Calendar, CheckCircle, Activity, SendHorizonal,
} from "lucide-react";

export default function ReferralDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [mySpecialist, setMySpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConsultForm, setShowConsultForm] = useState(false);

  const [consultData, setConsultData] = useState({
    diagnosis: "",
    icd_code: "",
    notes: "",
    treatment_plan: "",
    outcome: "FOLLOW_UP",
    investigations_ordered: [] as string[],
  });

  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/auth/login"); return; }
    const u = getUser();
    setUser(u);
    if (u && isSpecialistRole(u.role)) {
      specialistsApi.me().then((r) => setMySpecialist(r.data)).catch(() => {});
    }
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [refRes, consultRes] = await Promise.all([
        referralsApi.get(parseInt(id)),
        doctorApi.getConsultations(parseInt(id)),
      ]);
      setReferral(refRes.data);
      setConsultations(consultRes.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitConsultation() {
    setSubmitting(true);
    try {
      await doctorApi.updateCase({
        referral_id: parseInt(id),
        ...consultData,
        investigations_ordered: consultData.investigations_ordered.filter(Boolean),
      });
      toast.success("Consultation saved successfully");
      setShowConsultForm(false);
      loadData();
    } catch {
      toast.error("Failed to save consultation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScheduleFollowUp() {
    if (!followUpDate) { toast.error("Please select a date"); return; }
    setSubmitting(true);
    try {
      await followupsApi.create({
        patient_id: referral!.patient_id,
        referral_id: parseInt(id),
        next_visit_date: followUpDate,
        reason: followUpReason || undefined,
      });
      toast.success("Follow-up scheduled");
      setShowFollowUp(false);
    } catch {
      toast.error("Failed to schedule follow-up");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!referral) return <div className="p-8 text-center text-slate-500">Referral not found</div>;

  const p = referral.patient;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">Referral #{referral.id}</h1>
            <RiskBadge level={referral.risk_level} size="lg" />
            <StatusBadge status={referral.status} />
            <FeedbackBadge status={(referral.feedback_status ?? "PENDING") as FeedbackStatus} size="md" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Created {formatDateTime(referral.created_at)}
            {referral.source_facility && ` · From ${referral.source_facility}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-1">
          {/* Patient info */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Patient</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Name", value: p?.full_name },
                { label: "Age", value: p ? `${p.age} years` : "—" },
                { label: "Sex", value: p?.sex },
                { label: "Phone", value: p?.phone || "Not provided" },
                { label: "Ghana Card", value: p?.ghana_card || "Not provided" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-medium text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <button onClick={() => router.push(`/patient/${p?.id}`)} className="mt-4 w-full btn-secondary text-sm py-2">
              View Full Record
            </button>
          </div>

          {/* Routing info */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <SendHorizonal className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Routing</h3>
            </div>
            <div className="space-y-2.5">
              {referral.referring_physician && (
                <div>
                  <p className="text-xs text-slate-400">Referred by</p>
                  <p className="text-sm font-medium text-slate-800">
                    {referral.referring_physician.name}
                    <span className="text-xs text-slate-400 ml-1">
                      ({referral.referring_physician.role.replace(/_/g, " ")})
                    </span>
                  </p>
                </div>
              )}
              {referral.receiving_specialist?.user && (
                <div>
                  <p className="text-xs text-slate-400">Assigned specialist</p>
                  <p className="text-sm font-medium text-slate-800">
                    {referral.receiving_specialist.user.name}
                    <span className="text-xs text-slate-400 ml-1">
                      · {referral.receiving_specialist.specialty}
                    </span>
                  </p>
                </div>
              )}
              {referral.receiving_facility && (
                <div>
                  <p className="text-xs text-slate-400">Receiving facility</p>
                  <p className="text-sm font-medium text-slate-800">
                    {referral.receiving_facility.facility_name}
                    <span className="text-xs text-slate-400 ml-1">
                      · {referral.receiving_facility.city}
                    </span>
                  </p>
                </div>
              )}
              {referral.referral_reason && (
                <div>
                  <p className="text-xs text-slate-400">Reason for referral</p>
                  <p className="text-sm text-slate-700">{referral.referral_reason}</p>
                </div>
              )}
              {referral.decline_reason && (
                <div className="bg-red-50 rounded-lg p-2.5 mt-1">
                  <p className="text-xs font-semibold text-red-600 mb-0.5">Declined — reason</p>
                  <p className="text-sm text-red-800">{referral.decline_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vitals */}
          {referral.vitals && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Vital Signs</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(referral.vitals)
                  .filter(([, v]) => v != null)
                  .map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-sm font-semibold text-slate-900">{String(val)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Symptoms */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Presenting Symptoms</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {referral.symptoms.map((s) => (
                <span key={s} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            {referral.chief_complaint && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Chief Complaint</p>
                <p className="text-sm text-amber-900">{referral.chief_complaint}</p>
              </div>
            )}
            {referral.clinical_notes && (
              <div className="mt-3 bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Clinical Notes</p>
                <p className="text-sm text-slate-700">{referral.clinical_notes}</p>
              </div>
            )}
          </div>

          {/* Referral assignment actions */}
          <ReferralActions
            referral={referral}
            currentUserId={user.id}
            currentUserRole={user.role}
            specialistId={mySpecialist?.id}
            onUpdated={loadData}
          />

          {/* Timeline / feedback */}
          <ReferralFeedbackPanel
            referralId={referral.id}
            userRole={user.role}
            initialFeedbackStatus={(referral.feedback_status ?? "PENDING") as FeedbackStatus}
          />

          {/* Past consultations */}
          {consultations.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Consultations ({consultations.length})</h3>
              </div>
              <div className="space-y-4">
                {consultations.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-800">Dr. {c.doctor?.name ?? "Unknown"}</p>
                      <span className="text-xs text-slate-400">{formatDateTime(c.created_at)}</span>
                    </div>
                    {c.diagnosis && <p className="text-sm text-slate-700"><strong>Dx:</strong> {c.diagnosis}</p>}
                    {c.treatment_plan && <p className="text-sm text-slate-600 mt-1"><strong>Plan:</strong> {c.treatment_plan}</p>}
                    {c.outcome && (
                      <span className="mt-2 inline-block text-xs px-2 py-1 bg-brand-50 text-brand-700 rounded-full font-medium">
                        {c.outcome}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical action buttons */}
          {(isSpecialistRole(user.role) || user.role === "ADMIN") && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowConsultForm(!showConsultForm)} className="btn-primary flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {showConsultForm ? "Cancel" : "Add Consultation"}
              </button>
              <button onClick={() => setShowFollowUp(!showFollowUp)} className="btn-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Follow-up
              </button>
            </div>
          )}

          {/* Consultation form */}
          {showConsultForm && (
            <div className="card p-5 border-l-4 border-brand-600">
              <h3 className="font-semibold text-slate-900 mb-4">New Consultation</h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Diagnosis</label>
                    <input className="input" placeholder="Primary diagnosis" value={consultData.diagnosis}
                      onChange={(e) => setConsultData({ ...consultData, diagnosis: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">ICD Code</label>
                    <input className="input" placeholder="e.g. K25.0" value={consultData.icd_code}
                      onChange={(e) => setConsultData({ ...consultData, icd_code: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">Clinical Notes</label>
                  <textarea className="input resize-none" rows={3} placeholder="Findings, observations..."
                    value={consultData.notes}
                    onChange={(e) => setConsultData({ ...consultData, notes: e.target.value })} />
                </div>
                <div>
                  <label className="label">Treatment Plan</label>
                  <textarea className="input resize-none" rows={3} placeholder="Medications, procedures, referrals..."
                    value={consultData.treatment_plan}
                    onChange={(e) => setConsultData({ ...consultData, treatment_plan: e.target.value })} />
                </div>
                <div>
                  <label className="label">Outcome</label>
                  <select className="input" value={consultData.outcome}
                    onChange={(e) => setConsultData({ ...consultData, outcome: e.target.value })}>
                    <option value="FOLLOW_UP">Follow-up Required</option>
                    <option value="ADMITTED">Admitted</option>
                    <option value="DISCHARGED">Discharged</option>
                    <option value="REFERRED">Referred to Another Unit</option>
                  </select>
                </div>
                <button onClick={handleSubmitConsultation} className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Consultation"}
                </button>
              </div>
            </div>
          )}

          {/* Follow-up form */}
          {showFollowUp && (
            <div className="card p-5 border-l-4 border-blue-500">
              <h3 className="font-semibold text-slate-900 mb-4">Schedule Follow-up</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Next Visit Date *</label>
                  <input type="date" className="input" value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="label">Reason</label>
                  <input className="input" placeholder="e.g. Repeat endoscopy, medication review"
                    value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} />
                </div>
                <button onClick={handleScheduleFollowUp} className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Scheduling..." : "Schedule Follow-up"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
