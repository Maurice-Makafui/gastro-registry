import api from "./client";
import type { AnalyticsDashboard } from "@/types/analytics";

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  const { data } = await api.get<AnalyticsDashboard>("/analytics/dashboard");
  return data;
}
