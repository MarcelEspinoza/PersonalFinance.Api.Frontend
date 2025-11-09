// src/services/adminService.ts
import apiClient from "../lib/apiClient";

export const adminService = {
  getUsers: () => apiClient.get("/admin/users"),
  getUserRoles: (id: string) => apiClient.get(`/admin/users/${id}/roles`),
  addRole: (id: string, role: string) => apiClient.post(`/admin/users/${id}/roles`, { role }),
  removeRole: (id: string, role: string) => apiClient.delete(`/admin/users/${id}/roles/${encodeURIComponent(role)}`)
};