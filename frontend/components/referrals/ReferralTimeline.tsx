"use client";
import { ReferralTimelineEntry } from "@/types/referral-feedback";
import { formatDateTime } from "@/lib/utils";
import { Clock, GitBranch, MessageSquare } from "lucide-react";

interface ReferralTimelineProps {
  entries: ReferralTimelineEntry[];
  loading?: boolean;
}

export default function ReferralTimeline({ entries, loading }: ReferralTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No timeline events recorded yet
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={entry.id} className="relative pl-10">
            <div
              className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                entry.status_type === "FEEDBACK" ? "bg-brand-600" : "bg-blue-500"
              } ${index === 0 ? "ring-2 ring-brand-200" : ""}`}
            />
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      entry.status_type === "FEEDBACK"
                        ? "bg-brand-100 text-brand-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {entry.status_type === "FEEDBACK" ? "Feedback" : "Workflow"}
                  </span>
                  {entry.from_status && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {entry.from_status.replace(/_/g, " ")} → {entry.to_status.replace(/_/g, " ")}
                    </span>
                  )}
                  {!entry.from_status && (
                    <span className="text-xs font-medium text-slate-700">
                      {entry.to_status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {entry.actor?.name ?? "System"} · {entry.actor?.role?.replace(/_/g, " ") ?? ""}
              </p>
              {entry.note && (
                <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-700">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <p>{entry.note}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
