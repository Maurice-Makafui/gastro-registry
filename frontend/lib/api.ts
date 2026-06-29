import api from "./api/client";

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

export const patientsApi = {
  create: (data: Record<string, unknown>) => api.post("/patients/create", data),
  list: (search?: string) =>
    api.get("/patients/", { params: search ? { search } : {} }),
  get: (id: number) => api.get(`/patients/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/patients/${id}`, data),
};

export const referralsApi = {
  create: (data: Record<string, unknown>) => api.post("/referrals/create", data),
  list: (params?: Record<string, string>) => api.get("/referrals/list", { params }),
  incoming: (params?: Record<string, string>) => api.get("/referrals/incoming", { params }),
  incomingFacility: (params?: Record<string, string>) =>
    api.get("/referrals/incoming/facility", { params }),
  outgoing: (params?: Record<string, string>) => api.get("/referrals/outgoing", { params }),
  get: (id: number) => api.get(`/referrals/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/referrals/${id}`, data),
  route: (id: number, data: Record<string, unknown>) =>
    api.post(`/referrals/${id}/refer`, data),
  accept: (id: number, note?: string) =>
    api.post(`/referrals/${id}/accept`, { note }),
  decline: (id: number, decline_reason: string) =>
    api.post(`/referrals/${id}/decline`, { decline_reason }),
  referOn: (id: number, data: Record<string, unknown>) =>
    api.post(`/referrals/${id}/refer-on`, data),
  complete: (id: number) =>
    api.post(`/referrals/${id}/complete`, {}),
  registrySpecialists: (params?: Record<string, string | number>) =>
    api.get("/referrals/registry/specialists", { params }),
  registryFacilities: (params?: Record<string, string | number>) =>
    api.get("/referrals/registry/facilities", { params }),
};


export const doctorApi = {
  getReferrals: () => api.get("/doctor/referrals"),
  updateCase: (data: Record<string, unknown>) =>
    api.post("/doctor/update-case", data),
  getConsultations: (referralId: number) =>
    api.get(`/doctor/consultations/${referralId}`),
};

export const followupsApi = {
  create: (data: Record<string, unknown>) =>
    api.post("/followups/create", data),
  list: (params?: Record<string, string | number>) =>
    api.get("/followups/", { params }),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/followups/${id}`, data),
};

export const analyticsApi = {
  summary: () => api.get("/analytics/summary"),
};

export { facilitiesApi } from "./api/facilities";
export { specialistsApi } from "./api/specialists";
export { referralFeedbackApi } from "./api/referral-feedback";
export { proceduresApi } from "./api/procedures";
export { liverRegistryApi } from "./api/liver-registry";
export { getAnalyticsDashboard } from "./api/analytics";
export { getMyMembership, addCPDPoints, getGuidelines, getConferences } from "./api/members";
export { surveillanceApi } from "./api/surveillance";

export default api;
