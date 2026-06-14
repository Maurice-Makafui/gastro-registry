"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, AlertTriangle, UserCheck, CalendarClock, RefreshCcw } from "lucide-react";

type NotificationType = "referral" | "mdt" | "followup" | "membership";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: "referral",
    title: "Referral Accepted",
    body: "Dr. Mensah accepted referral #42 (HIGH risk).",
    timestamp: "2 min ago",
    read: false,
  },
  {
    id: 2,
    type: "mdt",
    title: "New MDT Case Assigned",
    body: "MDT Case #7 – Patient Ama Owusu requires your input.",
    timestamp: "18 min ago",
    read: false,
  },
  {
    id: 3,
    type: "followup",
    title: "Follow-up Overdue",
    body: "Hepatitis B follow-up for Kwame Asante is 3 days overdue.",
    timestamp: "1 hr ago",
    read: true,
  },
  {
    id: 4,
    type: "membership",
    title: "Membership Renewal Due",
    body: "Your GHGA membership expires on 31 July 2025.",
    timestamp: "Yesterday",
    read: true,
  },
];

const iconMap: Record<NotificationType, React.ReactNode> = {
  referral: <UserCheck className="w-4 h-4 text-emerald-600" />,
  mdt: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  followup: <CalendarClock className="w-4 h-4 text-blue-500" />,
  membership: <RefreshCcw className="w-4 h-4 text-purple-500" />,
};

const bgMap: Record<NotificationType, string> = {
  referral: "bg-emerald-50",
  mdt: "bg-amber-50",
  followup: "bg-blue-50",
  membership: "bg-purple-50",
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                  !n.read ? "bg-slate-50" : ""
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${bgMap[n.type]}`}>
                  {iconMap[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${!n.read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{n.timestamp}</p>
                </div>
              </li>
            ))}
          </ul>

          {items.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No notifications</p>
          )}
        </div>
      )}
    </div>
  );
}
