import apiClient from "../lib/apiClient";

export const adminService = {
  // Usuarios
  getUsers: () => apiClient.get("/admin/users"),
  getUser: (id: string) => apiClient.get(`/admin/users/${id}`),

  // Roles de un usuario
  getUserRoles: (id: string) => apiClient.get(`/admin/users/${id}/roles`),
  addRole: (id: string, role: string) => apiClient.post(`/admin/users/${id}/roles`, { role }),
  removeRole: (id: string, role: string) => apiClient.delete(`/admin/users/${id}/roles/${encodeURIComponent(role)}`),

  // Lista de roles disponibles en el sistema
  getAllRoles: () => apiClient.get("/admin/roles"),

  // Eliminar usuario
  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`)
};

export default adminService;