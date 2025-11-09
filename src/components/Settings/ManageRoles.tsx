import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";

type UserItem = { id: string; email: string; fullName?: string; };

export default function ManageRoles() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data } = await adminService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error loading users", err);
    }
  }

  async function loadRoles(userId: string) {
    try {
      const { data } = await adminService.getUserRoles(userId);
      setRoles(data.roles || []);
    } catch (err) {
      console.error("Error loading user roles", err);
      setRoles([]);
    }
  }

  async function handleSelect(user: UserItem) {
    setSelectedUser(user);
    await loadRoles(user.id);
  }

  async function handleAddRole() {
    if (!selectedUser || !newRole) return;
    try {
      await adminService.addRole(selectedUser.id, newRole);
      setNewRole("");
      await loadRoles(selectedUser.id);
    } catch (err) {
      console.error("Error adding role", err);
      alert("No se pudo agregar el rol");
    }
  }

  async function handleRemoveRole(role: string) {
    if (!selectedUser) return;
    try {
      await adminService.removeRole(selectedUser.id, role);
      await loadRoles(selectedUser.id);
    } catch (err) {
      console.error("Error removing role", err);
      alert("No se pudo quitar el rol");
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Gestión de roles (Admin)</h2>
      <div className="flex gap-6">
        <div className="w-1/3">
          <h3 className="font-medium mb-2">Usuarios</h3>
          <ul>
            {users.map(u => (
              <li key={u.id}>
                <button
                  className="text-left w-full px-2 py-1 hover:bg-slate-50"
                  onClick={() => handleSelect(u)}
                >
                  {u.fullName ?? u.email}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          {selectedUser ? (
            <>
              <h3 className="font-medium mb-2">Roles de {selectedUser.email}</h3>
              <div className="mb-3">
                {roles.length === 0 && <div className="text-sm text-slate-500">Sin roles</div>}
                <ul>
                  {roles.map(r => (
                    <li key={r} className="flex items-center gap-2 my-1">
                      <span className="px-2 py-1 bg-slate-100 rounded">{r}</span>
                      <button
                        className="text-red-600 text-sm"
                        onClick={() => handleRemoveRole(r)}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="Nuevo rol (ej. Admin)"
                  className="border px-2 py-1 rounded"
                />
                <button onClick={handleAddRole} className="bg-emerald-600 text-white px-3 py-1 rounded">
                  Agregar rol
                </button>
              </div>
            </>
          ) : (
            <div className="text-slate-500">Selecciona un usuario para gestionar roles.</div>
          )}
        </div>
      </div>
    </div>
  );
} 