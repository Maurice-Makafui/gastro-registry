import api from "./client";
import {
  LiverRegistryRecord,
  LiverRegistryAlertSummary,
  LiverRegistryScanResult,
  LiverDiagnosis,
  LiverRiskFlag,
} from "@/types/liver-registry";

export const liverRegistryApi = {
  alerts: () => api.get<LiverRegistryAlertSummary>("/liver-registry/alerts"),

  scan: () => api.post<LiverRegistryScanResult>("/liver-registry/scan"),

  list: (params?: {
    patient_id?: number;
    diagnosis?: LiverDiagnosis;
    risk_flag?: LiverRiskFlag;
    skip?: number;
    limit?: number;
  }) => api.get<LiverRegistryRecord[]>("/liver-registry/", { params }),

  get: (id: number) => api.get<LiverRegistryRecord>(`/liver-registry/${id}`),

  create: (data: {
    patient_id: number;
    facility_id: number;
    diagnosis: LiverDiagnosis;
    fibroscan_score?: number;
    viral_load?: number;
    afp?: number;
    alt?: number;
    ast?: number;
    ultrasound_date?: string;
    next_review_date: string;
  }) => api.post<LiverRegistryRecord>("/liver-registry/", data),

  update: (
    id: number,
    data: Partial<{
      diagnosis: LiverDiagnosis;
      fibroscan_score: number;
      viral_load: number;
      afp: number;
      alt: number;
      ast: number;
      ultrasound_date: string;
      next_review_date: string;
    }>
  ) => api.put<LiverRegistryRecord>(`/liver-registry/${id}`, data),
};
