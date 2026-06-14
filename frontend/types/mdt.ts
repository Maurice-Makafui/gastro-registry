export type MDTStatus = "OPEN" | "CONCLUDED";

export interface MDTCase {
  id: number;
  patient_id: number;
  submitted_by_user_id: number;
  history_summary: string;
  discussion_status: MDTStatus;
  final_recommendation?: string;
  created_at: string;
  updated_at?: string;
  submitted_by_name?: string;
  patient_name?: string;
  comment_count?: number;
}

export interface MDTCaseDetail extends MDTCase {
  comments: MDTComment[];
}

export interface MDTComment {
  id: number;
  case_id: number;
  user_id: number;
  comment_text: string;
  created_at: string;
  author_name?: string;
  author_role?: string;
}

export type RegistryType =
  | "HEPATITIS_B"
  | "LIVER_CIRRHOSIS"
  | "ENDOSCOPY"
  | "UPPER_GI_BLEEDING"
  | "COLORECTAL_CANCER";

export interface PatientRegistry {
  id: number;
  patient_id: number;
  registry_type: RegistryType;
  source_table: string;
  source_id: number;
  tagged_at: string;
  patient_name?: string;
}
