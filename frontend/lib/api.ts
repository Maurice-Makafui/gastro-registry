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
  list: (params?: Record<string, string>) =>
    api.get("/referrals/list", { params }),
  get: (id: number) => api.get(`/referrals/${id}`),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/referrals/${id}`, data),
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

export default api;
