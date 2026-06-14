import api from "./client";
import type { MDTCase, MDTCaseDetail, MDTComment } from "@/types/mdt";

export async function listMDTCases(statusFilter?: string): Promise<MDTCase[]> {
  const params = statusFilter ? { status_filter: statusFilter } : {};
  const { data } = await api.get<MDTCase[]>("/mdt/", { params });
  return data;
}

export async function getMDTCase(id: number): Promise<MDTCaseDetail> {
  const { data } = await api.get<MDTCaseDetail>(`/mdt/${id}`);
  return data;
}

export async function createMDTCase(payload: {
  patient_id: number;
  history_summary: string;
}): Promise<MDTCase> {
  const { data } = await api.post<MDTCase>("/mdt/", payload);
  return data;
}

export async function addMDTComment(caseId: number, comment_text: string): Promise<MDTComment> {
  const { data } = await api.post<MDTComment>(`/mdt/${caseId}/comments`, { comment_text });
  return data;
}

export async function concludeMDTCase(caseId: number, final_recommendation: string): Promise<MDTCaseDetail> {
  const { data } = await api.put<MDTCaseDetail>(`/mdt/${caseId}/conclude`, { final_recommendation });
  return data;
}
