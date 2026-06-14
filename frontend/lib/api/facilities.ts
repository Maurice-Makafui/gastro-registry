import api from "./client";
import {
  Facility,
  FacilityDetail,
  FacilityNetworkStats,
  FacilityType,
} from "@/types/facility";

export interface FacilityListParams {
  region?: string;
  city?: string;
  facility_type?: FacilityType;
  search?: string;
  skip?: number;
  limit?: number;
}

export const facilitiesApi = {
  stats: () => api.get<FacilityNetworkStats>("/facilities/stats"),

  list: (params?: FacilityListParams) =>
    api.get<Facility[]>("/facilities/", { params }),

  get: (id: number) => api.get<FacilityDetail>(`/facilities/${id}`),

  create: (data: {
    facility_name: string;
    facility_type: FacilityType;
    region: string;
    city: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }) => api.post<Facility>("/facilities/", data),

  update: (
    id: number,
    data: Partial<{
      facility_name: string;
      facility_type: FacilityType;
      region: string;
      city: string;
      email: string;
      phone: string;
      metadata: Record<string, unknown>;
      is_active: boolean;
    }>
  ) => api.put<Facility>(`/facilities/${id}`, data),

  delete: (id: number) => api.delete<Facility>(`/facilities/${id}`),
};
