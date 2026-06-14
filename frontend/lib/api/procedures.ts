import api from "./client";
import { Procedure, ProcedureTemplates, ProcedureType } from "@/types/procedure";

export const proceduresApi = {
  templates: (procedureType: ProcedureType) =>
    api.get<ProcedureTemplates>(`/procedures/templates/${procedureType}`),

  list: (params?: {
    patient_id?: number;
    procedure_type?: ProcedureType;
    facility_id?: number;
    skip?: number;
    limit?: number;
  }) => api.get<Procedure[]>("/procedures/", { params }),

  get: (id: number) => api.get<Procedure>(`/procedures/${id}`),

  create: (data: {
    patient_id: number;
    facility_id: number;
    procedure_type: ProcedureType;
    procedure_date: string;
    indication?: string;
    findings?: string;
    impression?: string;
    recommendation?: string;
    image_urls?: string[];
  }) => api.post<Procedure>("/procedures/", data),

  update: (
    id: number,
    data: Partial<{
      procedure_type: ProcedureType;
      procedure_date: string;
      indication: string;
      findings: string;
      impression: string;
      recommendation: string;
      image_urls: string[];
    }>
  ) => api.put<Procedure>(`/procedures/${id}`, data),
};
