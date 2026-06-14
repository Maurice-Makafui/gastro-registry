"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { isAuthenticated, getUser } from "@/lib/auth";
import { referralsApi } from "@/lib/api";

import RiskBadge from "@/components/ui/RiskBadge";

import { CheckCircle, AlertCircle, AlertTriangle, ArrowRight, Plus, Clock } from "lucide-react";

import type { User, Referral, RiskLevel } from "@/types";

const RISK_CONFIG: Record<
  RiskLevel,
  {
    bg: string;
    icon: any;
    iconColor: string;
    title: string;
    desc: string;
    action: string;
    actionBg: string;
  }
> = {
  HIGH: {
    bg: "bg-red-50 border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-600",
    title: "HIGH RISK — Urgent Referral Required",
    desc: "This patient has one or more high-risk symptoms. Immediate gastroenterology consultation is required within 24 hours.",
    action: "Contact the on-call gastroenterologist immediately.",
    actionBg: "bg-red-600 hover:bg-red-700",
  },
  MEDIUM: {
    bg: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    title: "MEDIUM RISK — Semi-urgent Review",
    desc: "This patient requires specialist consultation within 1 week. Monitor for symptom progression.",
    action: "Schedule gastroenterology appointment within 7 days.",
    actionBg: "bg-amber-600 hover:bg-amber-700",
  },
  LOW: {
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600",
    title: "LOW RISK — Routine Follow-up",
    desc: "Routine outpatient consultation can be scheduled within 2–4 weeks.",
    action: "Schedule routine outpatient appointment.",
    actionBg: "bg-green-600 hover:bg-green-700",
  },
};

export default function TriageResultPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);

  const [referralId, setReferralId] = useState<number | null>(null);
  const [risk, setRisk] = useState<RiskLevel>("LOW");

  const config = useMemo(() => RISK_CONFIG[risk]!, [risk]);
  const Icon = config.icon;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }

    const u = getUser();
    setUser(u);

    // Read query params only on the client to avoid prerender/build errors.
    const sp = new URLSearchParams(window.location.search);
    const rid = sp.get("referralId");
    const r = sp.get("risk") as RiskLevel | null;

    if (rid) {
      const parsed = Number.parseInt(rid, 10);
      if (!Number.isNaN(parsed)) setReferralId(parsed);
    }

    if (r && (r === "HIGH" || r === "MEDIUM" || r === "LOW")) {
      setRisk(r);
    }
  }, [router]);

  useEffect(() => {
    if (!referralId) return;

    referralsApi
      .get(referralId)
      .then((res) => setReferral(res.data))
      .catch(() => setReferral(null));
  }, [referralId]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              risk === "HIGH"
                ? "bg-red-100"
                : risk === "MEDIUM"
                  ? "bg-amber-100"
                  : "bg-green-100"
            }`}
          >
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Triage Complete</h1>
          <p className="text-slate-500 text-sm">
            Referral #{referralId ?? "—"} has been created
          </p>
        </div>

        <div className={`rounded-2xl border-2 p-6 mb-6 ${config.bg}`}>
          <div className="flex items-start gap-4">
            <Icon className={`w-6 h-6 mt-0.5 shrink-0 ${config.iconColor}`} />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-bold text-slate-900">{config.title}</h2>
                <RiskBadge level={risk} size="lg" />
              </div>
              <p className="text-slate-600 text-sm mb-3">{config.desc}</p>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Clock className="w-4 h-4" />
                <span>Recommended action: {config.action}</span>
              </div>
            </div>
          </div>
        </div>

        {referral?.patient && (
          <div className="card p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Patient Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Name</p>
                <p className="font-medium text-slate-900">{referral.patient.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Age / Sex</p>
                <p className="font-medium text-slate-900">
                  {referral.patient.age} yrs • {referral.patient.sex}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 mb-1">Presenting Symptoms</p>
                <div className="flex flex-wrap gap-1.5">
                  {referral.symptoms.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full"
                    >
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => router.push("/nurse/intake")}
            className="flex items-center justify-center gap-2 btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Intake
          </button>

          {referral && (
            <button
              onClick={() => router.push(`/doctor/referral/${referralId}`)}
              className="flex items-center justify-center gap-2 btn-secondary"
            >
              View Referral
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => router.push("/doctor/dashboard")}
            className="flex items-center justify-center gap-2 btn-secondary"
          >
            Dashboard
          </button>
        </div>
      </div>
  );
}
