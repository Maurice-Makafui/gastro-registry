import api from "./client";

export type NetworkEntityType = "SPECIALIST" | "FACILITY";
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type RegistryStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type MembershipStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type ApprovalStatus = "APPROVED_BY_GASLID" | "PENDING_APPROVAL";

export interface RegistryEntry {
  id: number;
  registry_number: string;
  entity_type: NetworkEntityType;
  specialist_id: number | null;
  facility_id: number | null;
  verification_status: VerificationStatus;
  registry_status: RegistryStatus;
  membership_status: MembershipStatus;
  approval_status: ApprovalStatus;
  approved_by: number | null;
  approved_at: string | null;
  expiry_date: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  region: string | null;
  district: string | null;
  created_at: string;
  facility_name: string | null;
  specialist_name: string | null;
}

export const networkRegistryApi = {
  list: (params?: {
    entity_type?: NetworkEntityType;
    approval_status?: ApprovalStatus;
    registry_status?: RegistryStatus;
  }) => api.get<RegistryEntry[]>("/network-registry/", { params }),

  create: (data: {
    entity_type: NetworkEntityType;
    specialist_id?: number;
    facility_id?: number;
    registry_number: string;
    region?: string;
    district?: string;
    expiry_date?: string;
  }) => api.post<RegistryEntry>("/network-registry/", data),

  approve: (id: number, expiry_date?: string) =>
    api.post<RegistryEntry>(`/network-registry/${id}/approve`, { expiry_date }),

  suspend: (id: number, suspension_reason: string) =>
    api.post<RegistryEntry>(`/network-registry/${id}/suspend`, null, {
      params: { suspension_reason },
    }),

  update: (id: number, data: Partial<RegistryEntry>) =>
    api.patch<RegistryEntry>(`/network-registry/${id}`, data),
};
