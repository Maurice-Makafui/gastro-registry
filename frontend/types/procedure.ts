export type ProcedureType = "GASTROSCOPY" | "COLONOSCOPY" | "ERCP" | "SIGMOIDOSCOPY";

export interface ProcedureTemplateOption {
  value: string;
  label: string;
}

export interface ProcedureTemplates {
  procedure_type: ProcedureType;
  indications: ProcedureTemplateOption[];
  common_findings: ProcedureTemplateOption[];
  impressions: ProcedureTemplateOption[];
  recommendations: ProcedureTemplateOption[];
}

export interface Procedure {
  id: number;
  patient_id: number;
  doctor_id: number;
  facility_id: number;
  procedure_type: ProcedureType;
  indication?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
  image_urls: string[];
  procedure_date: string;
  created_at: string;
  updated_at?: string;
  patient?: {
    id: number;
    full_name: string;
    age: number;
    sex: string;
    phone?: string;
  };
  doctor?: {
    id: number;
    name: string;
    email: string;
    role: string;
    department?: string;
  };
  facility?: {
    id: number;
    facility_name: string;
    city: string;
    region: string;
  };
}

export const PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  GASTROSCOPY: "Gastroscopy (OGD)",
  COLONOSCOPY: "Colonoscopy",
  ERCP: "ERCP",
  SIGMOIDOSCOPY: "Flexible Sigmoidoscopy",
};
