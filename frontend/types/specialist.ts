export type Specialty = "GASTROENTEROLOGY" | "HEPATOLOGY" | "GI_SURGERY";

export interface SpecialistUser {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
}

export interface SpecialistFacility {
  id: number;
  facility_name: string;
  city: string;
  region: string;
  facility_type: string;
}

export interface Specialist {
  id: number;
  user_id: number;
  specialty: Specialty;
  subspecialties: string[];
  institution_id: number;
  phone?: string;
  email?: string;
  bio?: string;
  interests: string[];
  is_public: boolean;
  created_at: string;
  updated_at?: string;
  user?: SpecialistUser;
  institution?: SpecialistFacility;
}

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  GASTROENTEROLOGY: "Gastroenterology",
  HEPATOLOGY: "Hepatology",
  GI_SURGERY: "GI Surgery",
};

export const COMMON_SUBSPECIALTIES = [
  "Advanced Endoscopy",
  "Inflammatory Bowel Disease",
  "Transplant Hepatology",
  "Viral Hepatitis",
  "Motility Disorders",
  "Nutrition",
  "Paediatric GI",
];

export const COMMON_INTERESTS = [
  "Colonoscopy",
  "ERCP",
  "EUS",
  "IBD",
  "Hepatitis B",
  "Hepatitis C",
  "Cirrhosis",
  "HCC surveillance",
  "UGIB",
  "Coeliac Disease",
];
