"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, ExternalLink, Clock, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { getUser } from "@/lib/auth";
import { getConferences } from "@/lib/api/members";
import type { Conference } from "@/types/analytics";
import type { User } from "@/types";

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function DeadlineBadge({ deadline }: { deadline?: string }) {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days < 0) return <span className="text-xs text-slate-400">Deadline passed</span>;
  const color = days <= 7 ? "text-red-600 bg-red-50" : days <= 30 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${color}`}>
      <Clock className="w-3 h-3" />
      {days === 0 ? "Deadline today" : `${days}d to deadline`}
    </span>
  );
}

const TAG_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
];

export default function ConferencesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    setUser(u);
    getConferences()
      .then(setConferences)
      .catch(() => toast.error("Failed to load conferences"))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  // Sort: upcoming first
  const sorted = [...conferences].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Conferences & Events</h1>
            <p className="text-sm text-slate-500">Upcoming professional development opportunities</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-sm">No upcoming events at this time.</div>
        ) : (
          <div className="space-y-4">
            {sorted.map((conf) => {
              const eventDays = daysUntil(conf.event_date);
              const isPast = eventDays < 0;
              const eventDate = new Date(conf.event_date).toLocaleDateString("en-GB", {
                weekday: "short", day: "numeric", month: "long", year: "numeric",
              });

              return (
                <div
                  key={conf.id}
                  className={`card p-6 transition-opacity ${isPast ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0 w-14 text-center hidden sm:block">
                      <div className="bg-violet-600 text-white rounded-t-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {new Date(conf.event_date).toLocaleString("en-GB", { month: "short" })}
                      </div>
                      <div className="border border-t-0 border-slate-200 rounded-b-lg px-2 py-1">
                        <p className="text-2xl font-bold text-slate-900 leading-tight">
                          {new Date(conf.event_date).getDate()}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(conf.event_date).getFullYear()}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {!isPast && eventDays <= 30 && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                            {eventDays === 0 ? "Today" : `In ${eventDays} days`}
                          </span>
                        )}
                        {isPast && (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Past Event</span>
                        )}
                        <DeadlineBadge deadline={conf.deadline} />
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">{conf.title}</h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {eventDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {conf.location}
                        </span>
                      </div>

                      {conf.description && (
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">{conf.description}</p>
                      )}

                      {/* Tags */}
                      {conf.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {conf.tags.map((tag, i) => (
                            <span key={tag} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                              <Tag className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {conf.registration_url && !isPast && (
                        <a
                          href={conf.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-1.5 rounded-lg transition-colors"
                        >
                          Register Now <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
  );
}
