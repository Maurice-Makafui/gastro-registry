import api from "./client";

export interface SurveillanceKPIs {
  total_liver_cases: number;
  total_gi_bleeding_cases: number;
  total_hcc_cases: number;
  total_procedures: number;
  missed_followups: number;
  pending_referrals: number;
  avg_referral_delay_days: number;
  endoscopy_completion_rate: number;
}

export interface DiseaseTrendPoint {
  period: string;
  hep_b: number;
  hep_c: number;
  cirrhosis: number;
  hcc: number;
  gi_bleeding: number;
}

export interface FacilityLoad {
  facility_id: number;
  facility_name: string;
  region: string;
  city: string;
  referral_count: number;
  procedure_count: number;
  liver_case_count: number;
  specialist_count: number;
}

export interface RegionalBurden {
  region: string;
  hep_b: number;
  hep_c: number;
  cirrhosis: number;
  hcc: number;
  total_cases: number;
}

export interface ReferralFlowEdge {
  source_facility: string;
  target_facility: string;
  count: number;
}

export interface SurveillanceDashboard {
  kpis: SurveillanceKPIs;
  disease_trend: DiseaseTrendPoint[];
  facility_loads: FacilityLoad[];
  regional_burden: RegionalBurden[];
  referral_flows: ReferralFlowEdge[];
  risk_flag_counts: Record<string, number>;
}

export interface UserAdminOut {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  facility_id?: number;
  facility_name?: string;
  is_active: boolean;
}

export const surveillanceApi = {
  dashboard: (params?: { weeks?: number; facility_id?: number; region?: string }) =>
    api.get<SurveillanceDashboard>("/surveillance/dashboard", { params }),

  listUsers: (params?: { skip?: number; limit?: number }) =>
    api.get<UserAdminOut[]>("/surveillance/users", { params }),

  updateUserRole: (userId: number, role: string) =>
    api.patch<UserAdminOut>(`/surveillance/users/${userId}/role`, { role }),

  toggleUserActive: (userId: number, is_active: boolean) =>
    api.patch<UserAdminOut>(`/surveillance/users/${userId}/active`, { is_active }),

  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
    phone?: string;
    facility_id?: number;
  }) => api.post<UserAdminOut>("/admin/users", data),
};
