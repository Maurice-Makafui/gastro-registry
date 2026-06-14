export type UserRole =
  | "NURSE"
  | "DOCTOR"
  | "ADMIN"
  | "GASTROENTEROLOGIST"
  | "HEPATOLOGIST"
  | "REFERRING_PHYSICIAN"
  | "RESEARCHER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  facility_id?: number;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export type Sex = "MALE" | "FEMALE" | "OTHER";

export interface Patient {
  id: number;
  full_name: string;
  age: number;
  sex: Sex;
  phone?: string;
  ghana_card?: string;
  address?: string;
  medical_history?: string;
  allergies?: string;
  created_at: string;
  referrals?: Referral[];
  followups?: FollowUp[];
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ReferralStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFERRED_OUT";

export type FeedbackStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";

export interface Vitals {
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  weight_kg?: number;
  height_cm?: number;
  respiratory_rate?: number;
}

export interface Referral {
  id: number;
  patient_id: number;
  created_by: number;
  referring_physician_id?: number;
  source_facility?: string;
  facility_id?: number;
  symptoms: string[];
  vitals?: Vitals;
  chief_complaint?: string;
  clinical_notes?: string;
  risk_level: RiskLevel;
  status: ReferralStatus;
  feedback_status?: FeedbackStatus;
  urgency?: string;
  assigned_doctor_id?: number;
  accepted_at?: string;
  completed_at?: string;
  outcome_summary?: string;
  recommendation_text?: string;
  created_at: string;
  patient?: Patient;
  assigned_doctor?: User;
  referring_physician?: User;
}

export interface Consultation {
  id: number;
  referral_id: number;
  doctor_id: number;
  diagnosis?: string;
  icd_code?: string;
  notes?: string;
  treatment_plan?: string;
  investigations_ordered?: string[];
  outcome?: string;
  created_at: string;
  doctor?: User;
}

export interface FollowUp {
  id: number;
  patient_id: number;
  referral_id?: number;
  next_visit_date: string;
  reason?: string;
  status: string;
  notes?: string;
  created_at: string;
  patient?: Patient;
}

export interface AnalyticsSummary {
  total_patients: number;
  total_referrals: number;
  pending_referrals: number;
  high_risk_referrals: number;
  medium_risk_referrals: number;
  low_risk_referrals: number;
  completed_referrals: number;
  referrals_today: number;
  upcoming_followups: number;
  referrals_by_status: Record<string, number>;
  referrals_by_risk: Record<string, number>;
  recent_referrals: Referral[];
}

export const SYMPTOMS_LIST = [
  { id: "vomiting_blood", label: "Vomiting Blood (Haematemesis)", risk: "HIGH" },
  { id: "black_stool", label: "Black / Tarry Stool (Melaena)", risk: "HIGH" },
  { id: "jaundice", label: "Jaundice (Yellow Eyes/Skin)", risk: "HIGH" },
  { id: "rectal_bleeding", label: "Rectal Bleeding", risk: "HIGH" },
  { id: "severe_abdominal_pain", label: "Severe Abdominal Pain", risk: "HIGH" },
  { id: "abdominal_pain", label: "Abdominal Pain", risk: "MEDIUM" },
  { id: "persistent_vomiting", label: "Persistent Vomiting", risk: "MEDIUM" },
  { id: "dysphagia", label: "Difficulty Swallowing (Dysphagia)", risk: "MEDIUM" },
  { id: "weight_loss", label: "Unexplained Weight Loss", risk: "MEDIUM" },
  { id: "chronic_diarrhea", label: "Chronic Diarrhoea (>2 weeks)", risk: "MEDIUM" },
  { id: "fever", label: "Fever", risk: "MEDIUM" },
  { id: "hepatomegaly", label: "Enlarged Liver (Hepatomegaly)", risk: "MEDIUM" },
  { id: "ascites", label: "Abdominal Swelling (Ascites)", risk: "MEDIUM" },
  { id: "loss_of_appetite", label: "Loss of Appetite", risk: "MEDIUM" },
  { id: "mild_nausea", label: "Mild Nausea", risk: "LOW" },
  { id: "bloating", label: "Bloating", risk: "LOW" },
  { id: "constipation", label: "Constipation", risk: "LOW" },
  { id: "heartburn", label: "Heartburn / Acid Reflux", risk: "LOW" },
  { id: "mild_diarrhea", label: "Mild Diarrhoea", risk: "LOW" },
  { id: "flatulence", label: "Excessive Gas (Flatulence)", risk: "LOW" },
];
