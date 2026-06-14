import api from "./client";
import type { Membership, Guideline, Conference } from "@/types/analytics";

export async function getMyMembership(): Promise<Membership> {
  const { data } = await api.get<Membership>("/members/me");
  return data;
}

export async function addCPDPoints(points_to_add: number): Promise<Membership> {
  const { data } = await api.post<Membership>("/members/me/cpd", { points_to_add });
  return data;
}

export async function getGuidelines(): Promise<Guideline[]> {
  const { data } = await api.get<Guideline[]>("/members/guidelines");
  return data;
}

export async function getConferences(): Promise<Conference[]> {
  const { data } = await api.get<Conference[]>("/members/conferences");
  return data;
}
