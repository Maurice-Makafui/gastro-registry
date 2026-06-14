"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { liverRegistryApi } from "@/lib/api/liver-registry";
import { proceduresApi } from "@/lib/api/procedures";
import {
  Database,
  Droplets,
  Activity,
  Microscope,
  AlertTriangle,
  Ribbon,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

// ── Registry definitions ──────────────────────────────────────────────────────

interface RegistryMeta {
  slug: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  source: "liver" | "procedure" | "consultation";
  tag: string;
}

const REGISTRIES: RegistryMeta[] = [
  {
    slug: "hepatitis-b",
    label: "Hepatitis B",
    description: "Chronic HBV surveillance — viral load, ALT, FibroScan, and review scheduling.",
    icon: Droplets,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    source: "liver",
    tag: "HEP_B",
  },
  {
    slug: "liver-cirrhosis",
    label: "Liver Cirrhosis",
    description: "CLD progression tracking — ascites, varices, MELD scores, and AFP surveillance.",
    icon: Activity,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    source: "liver",
    tag: "CIRRHOSIS",
  },
  {
    slug: "endoscopy",
    label: "Endoscopy",
    description: "All endoscopic procedures — OGD, colonoscopy, ERCP, and sigmoidoscopy reports.",
    icon: Microscope,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    source: "procedure",
    tag: "ALL",
  },
  {
    slug: "upper-gi-bleed",
    label: "Upper GI Bleeding",
    description: "Haematemesis and melaena cases — Rockall scoring, endoscopy findings, and outcomes.",
    icon: AlertTriangle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    source: "consultation",
    tag: "UGIB",
  },
  {
    slug: "colorectal-cancer",
    label: "Colorectal Cancer",
    description: "CRC screening and surveillance — colonoscopy findings, staging, and MDT outcomes.",
    icon: Ribbon,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    source: "consultation",
    tag: "CRC",
  },
];

// ── Count card ────────────────────────────────────────────────────────────────

function RegistryCard({
  registry,
  count,
  loading,
}: {
  registry: RegistryMeta;
  count: number | null;
  loading: boolean;
}) {
  const router = useRouter();
  const Icon = registry.icon;

  return (
    <button
      onClick={() => router.push(`/registries/${registry.slug}`)}
      className="card p-5 text-left hover:shadow-card-hover transition-all duration-150 group w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${registry.iconBg}`}>
          <Icon className={`w-5 h-5 ${registry.iconColor}`} />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all duration-150 mt-1" />
      </div>

      <p className="text-lg font-bold text-slate-900 leading-tight mb-1">
        {loading ? (
          <span className="inline-block w-10 h-5 bg-slate-200 rounded animate-pulse" />
        ) : (
          count ?? "—"
        )}
      </p>
      <p className="text-sm font-semibold text-slate-800 mb-1">{registry.label}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{registry.description}</p>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-400 capitalize">
          Auto-populated from {registry.source} workflow
        </span>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegistriesPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/auth/login"); return; }
    fetchCounts();
  }, []);

  async function fetchCounts() {
    setLoading(true);
    try {
      const [hepB, cirrhosis, allProcs] = await Promise.all([
        liverRegistryApi.list({ diagnosis: "HEP_B" }),
        liverRegistryApi.list({ diagnosis: "CIRRHOSIS" }),
        proceduresApi.list(),
      ]);

      setCounts({
        "hepatitis-b":       hepB.data.length,
        "liver-cirrhosis":   cirrhosis.data.length,
        "endoscopy":         allProcs.data.length,
        // Upper GI Bleed and CRC are derived from consultations;
        // counts fetched on their respective sub-pages.
        "upper-gi-bleed":    null,
        "colorectal-cancer": null,
      });
    } catch {
      // counts stay null — sub-pages handle their own data
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clinical Registries</h1>
          <p className="text-sm text-slate-500">
            Auto-populated from intake, procedure, and consultation workflows — no duplicate entry.
          </p>
        </div>
      </div>

      {/* Registry cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REGISTRIES.map((r) => (
          <RegistryCard
            key={r.slug}
            registry={r}
            count={counts[r.slug] ?? null}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
