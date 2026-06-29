import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RiskLevel, ReferralStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskBadgeClass(risk: RiskLevel): string {
  switch (risk) {
    case "HIGH":
      return "bg-red-100 text-red-800 border border-red-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "LOW":
      return "bg-green-100 text-green-800 border border-green-200";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getStatusBadgeClass(status: ReferralStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    case "PENDING":
    case "SUBMITTED":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "ASSIGNED":
    case "UNDER_REVIEW":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "ACCEPTED":
      return "bg-teal-100 text-teal-800 border border-teal-200";
    case "SCHEDULED":
      return "bg-indigo-100 text-indigo-800 border border-indigo-200";
    case "DECLINED":
      return "bg-red-100 text-red-700 border border-red-200";
    case "REFERRED_ON":
    case "REFERRED_OUT":
      return "bg-purple-100 text-purple-800 border border-purple-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 border border-green-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-600 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}
