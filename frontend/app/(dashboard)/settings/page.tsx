"use client";

import { useState } from "react";
import {
  User,
  Bell,
  ShieldCheck,
  Building2,
  Mail,
  MessageSquare,
  Phone,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  Smartphone,
  MonitorCheck,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "notifications" | "security";

interface NotifRow {
  key: string;
  label: string;
  description: string;
  channels: ("email" | "sms" | "whatsapp")[];
}

type NotifState = Record<string, Record<string, boolean>>;

// ── Static data ───────────────────────────────────────────────────────────────

const FACILITIES = [
  "Korle-Bu Teaching Hospital",
  "37 Military Hospital",
  "Komfo Anokye Teaching Hospital",
  "Ridge Hospital",
  "Trust Hospital",
  "Private Clinic",
];

const SPECIALTIES = [
  "Gastroenterology",
  "Hepatology",
  "Gastroenterology & Hepatology",
  "General Surgery",
  "Internal Medicine",
];

const NOTIF_ROWS: NotifRow[] = [
  {
    key: "mdt",
    label: "MDT Board Mentions",
    description: "When you are tagged in a multidisciplinary team discussion",
    channels: ["email", "whatsapp"],
  },
  {
    key: "high_risk",
    label: "High-Risk Referral Alerts",
    description: "Immediate alerts for incoming HIGH triage referrals",
    channels: ["email", "sms"],
  },
  {
    key: "followup",
    label: "Follow-up Reminders",
    description: "Reminders for scheduled patient follow-up appointments",
    channels: ["email", "sms"],
  },
  {
    key: "announcements",
    label: "Association Announcements",
    description: "Ghana Gastroenterology Association news and circulars",
    channels: ["email"],
  },
];

const CHANNEL_META: Record<
  "email" | "sms" | "whatsapp",
  { icon: typeof Mail; label: string; soon: boolean }
> = {
  email:    { icon: Mail,           label: "Email",    soon: false },
  sms:      { icon: Phone,          label: "SMS",      soon: true  },
  whatsapp: { icon: MessageSquare,  label: "WhatsApp", soon: true  },
};

const SESSION_HISTORY = [
  {
    id: 1,
    ip: "196.168.xxx.xxx",
    location: "Accra, Ghana",
    date: "15 Jul 2025, 08:42",
    device: "Chrome / Windows",
    current: true,
  },
  {
    id: 2,
    ip: "41.203.xxx.xxx",
    location: "Kumasi, Ghana",
    date: "13 Jul 2025, 14:17",
    device: "Safari / iPhone",
    current: false,
  },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function TabButton({
  id,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  id: Tab;
  active: boolean;
  icon: typeof User;
  label: string;
  onClick: (t: Tab) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-colors duration-150
        ${
          active
            ? "bg-brand-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
    </button>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${checked ? "bg-brand-600" : "bg-slate-300"}`}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Tab 1: Profile & Workspace ────────────────────────────────────────────────

function ProfileTab() {
  const [form, setForm] = useState({
    name: "Dr. Kwame Asante",
    credentials: "MD, FWACP",
    specialty: "Gastroenterology & Hepatology",
    facility: "Korle-Bu Teaching Hospital",
  });
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSave} className="space-y-7">
      {/* Personal info */}
      <div className="card p-6">
        <SectionHeader
          title="Personal Information"
          subtitle="Your profile details visible to colleagues and referring physicians."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Medical Credentials</label>
            <input
              className="input"
              placeholder="e.g. MD, FWACP, MGCP"
              value={form.credentials}
              onChange={(e) =>
                setForm({ ...form, credentials: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Primary Specialty</label>
            <select
              className="input"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            >
              {SPECIALTIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Facility switcher */}
      <div className="card p-6">
        <SectionHeader
          title="Active Facility"
          subtitle="New referrals you accept will be routed to this location."
        />
        <div className="space-y-2">
          {FACILITIES.map((f) => (
            <label
              key={f}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors duration-150
                ${
                  form.facility === f
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
            >
              <input
                type="radio"
                name="facility"
                value={f}
                checked={form.facility === f}
                onChange={() => setForm({ ...form, facility: f })}
                className="accent-brand-600"
              />
              <Building2
                className={`w-4 h-4 shrink-0 ${
                  form.facility === f ? "text-brand-600" : "text-slate-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  form.facility === f ? "text-brand-700" : "text-slate-700"
                }`}
              >
                {f}
              </span>
              {form.facility === f && (
                <span className="ml-auto text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary flex items-center gap-2">
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Tab 2: Notifications ──────────────────────────────────────────────────────

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifState>(() =>
    Object.fromEntries(
      NOTIF_ROWS.map((r) => [
        r.key,
        Object.fromEntries(r.channels.map((c) => [c, c === "email"])),
      ])
    )
  );

  function toggle(key: string, channel: string) {
    setPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
  }

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <SectionHeader
            title="Alert Preferences"
            subtitle="Choose how you receive clinical notifications and announcements."
          />
          <p className="text-xs text-slate-400 -mt-2 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            SMS and WhatsApp channels are{" "}
            <span className="font-semibold text-amber-500">coming soon</span>.
          </p>
        </div>

        {/* Desktop column headers */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-x-8 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Alert</span>
          {(["email", "sms", "whatsapp"] as const).map((ch) => {
            const m = CHANNEL_META[ch];
            const Icon = m.icon;
            return (
              <span key={ch} className="flex items-center gap-1 justify-center">
                <Icon className="w-3.5 h-3.5" />
                {m.label}
                {m.soon && (
                  <span className="ml-0.5 text-[9px] bg-amber-100 text-amber-600 px-1 rounded font-bold">
                    SOON
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-50">
          {NOTIF_ROWS.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-y-3 gap-x-8 px-6 py-4 hover:bg-slate-50/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{row.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{row.description}</p>
              </div>
              {(["email", "sms", "whatsapp"] as const).map((ch) => {
                const hasChannel = row.channels.includes(ch);
                const isSoon = CHANNEL_META[ch].soon;
                return (
                  <div
                    key={ch}
                    className="flex sm:justify-center items-center gap-2 sm:gap-0"
                  >
                    <span className="sm:hidden text-xs text-slate-500 w-20">
                      {CHANNEL_META[ch].label}
                      {isSoon && (
                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-600 px-1 rounded">
                          SOON
                        </span>
                      )}
                    </span>
                    <Toggle
                      checked={hasChannel ? (prefs[row.key]?.[ch] ?? false) : false}
                      onChange={() => toggle(row.key, ch)}
                      disabled={!hasChannel || isSoon}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Security & Access ──────────────────────────────────────────────────

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm) return;
    setPwSaved(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwSaved(false), 2500);
  }

  const pwFields = [
    { id: "current" as const, label: "Current Password", show: showCurrent, setShow: setShowCurrent, autoComplete: "current-password" },
    { id: "next"    as const, label: "New Password",     show: showNew,     setShow: setShowNew,     autoComplete: "new-password"     },
    { id: "confirm" as const, label: "Confirm New Password", show: showConfirm, setShow: setShowConfirm, autoComplete: "new-password" },
  ];

  return (
    <div className="space-y-6">
      {/* Password management */}
      <div className="card p-6">
        <SectionHeader
          title="Password Management"
          subtitle="Use a strong, unique password of at least 12 characters."
        />
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          {pwFields.map(({ id, label, show, setShow, autoComplete }) => (
            <div key={id}>
              <label className="label">{label}</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  className="input pr-10"
                  value={pwForm[id]}
                  onChange={(e) => setPwForm({ ...pwForm, [id]: e.target.value })}
                  autoComplete={autoComplete}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" className="btn-primary flex items-center gap-2">
            {pwSaved ? (
              <><CheckCircle2 className="w-4 h-4" /> Password Updated!</>
            ) : (
              <><KeyRound className="w-4 h-4" /> Update Password</>
            )}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck
                className={`w-5 h-5 ${twoFA ? "text-brand-600" : "text-slate-400"}`}
              />
              <h2 className="text-base font-semibold text-slate-900">
                Two-Factor Authentication
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Add a second layer of security using an authenticator app (TOTP).
            </p>
            {twoFA && (
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3" /> 2FA Enabled
              </span>
            )}
          </div>
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </div>
      </div>

      {/* Session history */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <MonitorCheck className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">
            Recent Login Sessions
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {SESSION_HISTORY.map((s) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <MonitorCheck className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{s.device}</p>
                    {s.current && (
                      <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {s.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.date}
                    </span>
                  </div>
                </div>
              </div>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
                {s.ip}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile",       label: "Profile & Workspace", icon: User        },
  { id: "notifications", label: "Notifications",        icon: Bell        },
  { id: "security",      label: "Security & Access",    icon: ShieldCheck },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const CONTENT: Record<Tab, React.ReactNode> = {
    profile:       <ProfileTab />,
    notifications: <NotificationsTab />,
    security:      <SecurityTab />,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Settings &amp; Preferences
            </h1>
            <p className="text-sm text-slate-500">
              Manage your profile, notifications, and account security.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vertical tab sidebar */}
          <aside className="lg:w-52 shrink-0">
            <nav className="card p-2 space-y-0.5 lg:sticky lg:top-6">
              {TABS.map((t) => (
                <TabButton
                  key={t.id}
                  id={t.id}
                  active={activeTab === t.id}
                  icon={t.icon}
                  label={t.label}
                  onClick={setActiveTab}
                />
              ))}
            </nav>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0">{CONTENT[activeTab]}</div>
        </div>
      </div>
    </div>
  );
}
