import api from "@/lib/api/client";

export interface AdminUserAdminOut {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  facility_id?: number | null;
  facility_name?: string | null;
  is_active: boolean;
  created_at?: string; // if backend includes it later
}

export const adminUsersApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<AdminUserAdminOut[]>("/admin/users", { params }),

  create: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string | null;
    phone?: string | null;
    facility_id?: number | null;
  }) => api.post<AdminUserAdminOut>("/admin/users", data),

  update: (id: number, data: Partial<{
    name: string;
    email: string;
    role: string;
    department: string;
    phone: string;
    facility_id: number | null;
  }>) => api.patch<AdminUserAdminOut>(`/admin/users/${id}`, data),

  suspend: (id: number) => api.post<AdminUserAdminOut>(`/admin/users/${id}/suspend`, {}),
  reactivate: (id: number) => api.post<AdminUserAdminOut>(`/admin/users/${id}/reactivate`, {}),
};

