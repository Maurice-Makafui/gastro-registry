import api from "./client";
import { Specialist, Specialty } from "@/types/specialist";

export interface SpecialistListParams {
  search?: string;
  specialty?: Specialty;
  institution_id?: number;
  subspecialty?: string;
  interest?: string;
  skip?: number;
  limit?: number;
}

export const specialistsApi = {
  list: (params?: SpecialistListParams) =>
    api.get<Specialist[]>("/specialists/", { params }),

  get: (id: number) => api.get<Specialist>(`/specialists/${id}`),

  me: () => api.get<Specialist>("/specialists/me"),

  create: (data: {
    specialty: Specialty;
    subspecialties?: string[];
    institution_id: number;
    phone?: string;
    email?: string;
    bio?: string;
    interests?: string[];
    is_public?: boolean;
  }) => api.post<Specialist>("/specialists/", data),

  update: (
    id: number,
    data: Partial<{
      specialty: Specialty;
      subspecialties: string[];
      institution_id: number;
      phone: string;
      email: string;
      bio: string;
      interests: string[];
      is_public: boolean;
    }>
  ) => api.put<Specialist>(`/specialists/${id}`, data),
};
