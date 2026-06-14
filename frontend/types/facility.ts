export type FacilityType = "HOSPITAL" | "CLINIC" | "PRIVATE";

export interface Facility {
  id: number;
  facility_name: string;
  facility_type: FacilityType;
  region: string;
  city: string;
  email?: string;
  phone?: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FacilityRosterMember {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
}

export interface FacilityDetail extends Facility {
  specialist_count: number;
  referral_count: number;
  roster: FacilityRosterMember[];
}

export interface FacilityNetworkStats {
  total_facilities: number;
  active_facilities: number;
  facilities_by_type: Record<string, number>;
  facilities_by_region: Record<string, number>;
  total_specialists: number;
  total_referrals: number;
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  HOSPITAL: "Hospital",
  CLINIC: "Clinic",
  PRIVATE: "Private Practice",
};

export const FACILITY_TYPE_COLORS: Record<FacilityType, string> = {
  HOSPITAL: "bg-blue-100 text-blue-800 border-blue-200",
  CLINIC: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PRIVATE: "bg-purple-100 text-purple-800 border-purple-200",
};
