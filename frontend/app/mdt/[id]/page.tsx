"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, Clock, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { getUser } from "@/lib/auth";
import { getMDTCase, addMDTComment, concludeMDTCase } from "@/lib/api/mdt";
import type { MDTCaseDetail, MDTComment } from "@/types/mdt";
import type { User } from "@/types";

const ROLE_COLORS: Record<string, string> = {
  DOCTOR: "bg-emerald-100 text-emerald-800",
  GASTROENTEROLOGIST: "bg-emerald-100 text-emerald-800",
  HEPATOLOGIST: "bg-teal-100 text-teal-800",
  ADMIN: "bg-purple-100 text-purple-800",
  NURSE: "bg-blue-100 text-blue-800",
};

export default function MDTCaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = Number(params.id);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [mdtCase, setMdtCase] = useState<MDTCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [concluding, setConcluding] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    setUser(u);
    loadCase();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mdtCase?.comments]);

  async function loadCase() {
    setLoading(true);
    try {
      const data = await getMDTCase(caseId);
      setMdtCase(data);
      if (data.final_recommendation) setRecommendation(data.final_recommendation);
    } catch {
      toast.error("Failed to load MDT case");
    } finally {
      setLoading(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const comment = await addMDTComment(caseId, commentText.trim());
      setMdtCase((prev) => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
      setCommentText("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSending(false);
    }
  }

  async function handleConclude(e: React.FormEvent) {
    e.preventDefault();
    if (!recommendation.trim()) return;
    setConcluding(true);
    try {
      const updated = await concludeMDTCase(caseId, recommendation.trim());
      setMdtCase(updated);
      toast.success("Case concluded");
    } catch {
      toast.error("Failed to conclude case");
    } finally {
      setConcluding(false);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
    );
  }

  if (!mdtCase) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">Case not found.</div>
    );
  }

  const isOpen = mdtCase.discussion_status === "OPEN";

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push("/mdt")} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900">
                MDT Case #{mdtCase.id} — {mdtCase.patient_name ?? `Patient #${mdtCase.patient_id}`}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isOpen ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isOpen ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {mdtCase.discussion_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submitted by {mdtCase.submitted_by_name ?? "Unknown"} · {new Date(mdtCase.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Patient history & diagnostic summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Clinical History & Diagnostic Summary
            </h2>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{mdtCase.history_summary}</p>
          </div>

          {/* Concluded recommendation (read-only display) */}
          {!isOpen && mdtCase.final_recommendation && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-emerald-800">Final Recommendation</h2>
              </div>
              <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">{mdtCase.final_recommendation}</p>
            </div>
          )}

          {/* Conclude form — only when OPEN */}
          {isOpen && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Sign-off & Conclude
              </h2>
              <form onSubmit={handleConclude} className="space-y-3">
                <textarea
                  rows={4}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Enter the team's final recommendation and management plan…"
                />
                <button
                  type="submit"
                  disabled={concluding || !recommendation.trim()}
                  className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {concluding ? "Concluding…" : "Conclude Case"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT — Comment thread */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Team Discussion ({mdtCase.comments.length})</h2>
          </div>

          {/* Comment scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mdtCase.comments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No comments yet. Start the discussion.</p>
            ) : (
              mdtCase.comments.map((c: MDTComment) => (
                <CommentBubble key={c.id} comment={c} currentUserId={user.id} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Comment input */}
          {isOpen ? (
            <form onSubmit={handleComment} className="border-t border-slate-200 p-3 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your clinical opinion…"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={sending || !commentText.trim()}
                className="bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400 text-center">
              This case has been concluded. Discussion is closed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentBubble({ comment, currentUserId }: { comment: MDTComment; currentUserId: number }) {
  const isMine = comment.user_id === currentUserId;
  const roleColor = ROLE_COLORS[comment.author_role ?? ""] ?? "bg-slate-100 text-slate-700";

  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">{comment.author_name ?? `User #${comment.user_id}`}</span>
          {comment.author_role && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColor}`}>
              {comment.author_role.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isMine ? "bg-violet-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"
          }`}
        >
          {comment.comment_text}
        </div>
        <span className="text-[10px] text-slate-400">
          {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
