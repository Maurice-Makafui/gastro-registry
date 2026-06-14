export type LiverDiagnosis = "HEP_B" | "HEP_C" | "CIRRHOSIS" | "HCC";
export type LiverRiskFlag = "NORMAL" | "OVERDUE" | "TREND_ALERT";

export interface LiverRegistryRecord {
  id: number;
  patient_id: number;
  facility_id: number;
  recorded_by: number;
  diagnosis: LiverDiagnosis;
  fibroscan_score?: number;
  viral_load?: number;
  afp?: number;
  alt?: number;
  ast?: number;
  ultrasound_date?: string;
  next_review_date: string;
  risk_flag: LiverRiskFlag;
  created_at: string;
  updated_at?: string;
  patient?: {
    id: number;
    full_name: string;
    age: number;
    sex: string;
  };
  recorder?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface LiverRegistryAlertSummary {
  total_alerts: number;
  overdue_count: number;
  trend_alert_count: number;
  alerts: LiverRegistryRecord[];
}

export interface LiverRegistryScanResult {
  scanned_records: number;
  overdue_count: number;
  trend_alert_count: number;
  normal_count: number;
}

export const DIAGNOSIS_LABELS: Record<LiverDiagnosis, string> = {
  HEP_B: "Hepatitis B",
  HEP_C: "Hepatitis C",
  CIRRHOSIS: "Liver Cirrhosis",
  HCC: "Hepatocellular Carcinoma",
};

export const RISK_FLAG_LABELS: Record<LiverRiskFlag, string> = {
  NORMAL: "On Track",
  OVERDUE: "Review Overdue",
  TREND_ALERT: "Lab Trend Alert",
};

export const RISK_FLAG_COLORS: Record<LiverRiskFlag, string> = {
  NORMAL: "bg-green-100 text-green-800 border-green-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  TREND_ALERT: "bg-amber-100 text-amber-800 border-amber-200",
};
