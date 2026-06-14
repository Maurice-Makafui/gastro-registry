export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface NameValuePair {
  name: string;
  value: number;
}

export interface FacilityProcedureVolume {
  facility_id: number;
  facility_name: string;
  city: string;
  GASTROSCOPY: number;
  COLONOSCOPY: number;
  ERCP: number;
  SIGMOIDOSCOPY: number;
  total: number;
}

export interface ReferralBottleneck {
  status: string;
  count: number;
  avg_age_days: number;
}

export interface DiseaseBurden {
  registry_type: string;
  patient_count: number;
}

export interface AnalyticsDashboard {
  total_patients: number;
  total_referrals: number;
  total_procedures: number;
  total_liver_records: number;
  referral_trend: TimeSeriesPoint[];
  facility_procedure_volumes: FacilityProcedureVolume[];
  referral_bottlenecks: ReferralBottleneck[];
  disease_burden: DiseaseBurden[];
  liver_diagnosis_breakdown: NameValuePair[];
  risk_distribution: NameValuePair[];
  procedure_type_breakdown: NameValuePair[];
}

export type MembershipStatus = "ACTIVE" | "PENDING" | "EXPIRED";

export interface Membership {
  id: number;
  user_id: number;
  status: MembershipStatus;
  renewal_date?: string;
  cpd_points_accumulated: number;
  created_at: string;
  updated_at?: string;
  member_name?: string;
  member_email?: string;
  member_role?: string;
}

export interface Guideline {
  id: number;
  title: string;
  category: string;
  published_date: string;
  file_url: string;
  description?: string;
}

export interface Conference {
  id: number;
  title: string;
  location: string;
  event_date: string;
  deadline?: string;
  description?: string;
  registration_url?: string;
  tags: string[];
}
