import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";

type UserDto = {
  id: string;
  userName?: string | null;
  email?: string | null;
  fullName?: string | null;
  createdAt?: string | null;
  roles?: string[];
};

export default function ManageRoles() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newRole, setNewRole] = useState<string>("");

  const unwrap = (res: any) => (res && typeof res === "object" && "data" in res ? res.data : res);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const resUsers = await adminService.getUsers();
      const dataUsers = unwrap(resUsers) || [];
      setUsers(Array.isArray(dataUsers) ? dataUsers : []);

      const resRoles = await adminService.getAllRoles();
      const dataRoles = unwrap(resRoles) || [];
      setAvailableRoles(Array.isArray(dataRoles) ? dataRoles : []);
    } catch (err) {
      console.error("Error cargando usuarios/roles", err);
      alert("Error cargando usuarios o roles (revisa consola).");
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (u: UserDto) => {
    setSelectedUser(null);
    setNewRole("");
    try {
      const res = await adminService.getUser(u.id);
      const data = unwrap(res) ?? u;

      // ensure roles up-to-date: will be returned by GetUser, but fallback to getUserRoles
      const roles = data.roles ?? unwrap(await adminService.getUserRoles(u.id)) ?? [];
      setSelectedUser({
        id: data.id,
        userName: data.userName ?? data.fullName ?? data.email,
        email: data.email,
        fullName: data.fullName,
        createdAt: data.createdAt,
        roles,
      });
    } catch (err) {
      console.error("Error cargando usuario", err);
      setSelectedUser({ ...u, roles: u.roles ?? [] });
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser) return;
    if (!newRole) return alert("Selecciona un rol para añadir.");
    setSaving(true);
    try {
      // POST returns updated roles (backend) - but to be safe we fetch roles again
      await adminService.addRole(selectedUser.id, newRole);
      const rolesRes = await adminService.getUserRoles(selectedUser.id);
      const roles = unwrap(rolesRes) ?? [];
      setSelectedUser(prev => prev ? { ...prev, roles } : prev);
      setNewRole("");
      await loadAll();
    } catch (err) {
      console.error("Error añadiendo rol", err);
      alert("No se pudo añadir el rol.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!selectedUser) return;
    if (!confirm(`Quitar rol "${role}" a ${selectedUser.userName || selectedUser.email || selectedUser.id}?`)) return;
    setSaving(true);
    try {
      await adminService.removeRole(selectedUser.id, role);
      const rolesRes = await adminService.getUserRoles(selectedUser.id);
      const roles = unwrap(rolesRes) ?? [];
      setSelectedUser(prev => prev ? { ...prev, roles } : prev);
      await loadAll();
    } catch (err) {
      console.error("Error eliminando rol", err);
      alert("No se pudo quitar el rol.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm(`Eliminar usuario ${selectedUser.userName || selectedUser.email || selectedUser.id}? Esta acción es irreversible.`)) return;
    setDeleting(true);
    try {
      await adminService.deleteUser(selectedUser.id);
      setSelectedUser(null);
      await loadAll();
      alert("Usuario eliminado");
    } catch (err) {
      console.error("Error eliminando usuario", err);
      alert("No se pudo eliminar el usuario.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded border p-6">
      <h3 className="text-lg font-semibold mb-4">Gestión de roles (Admin)</h3>

      <div className="flex gap-6">
        <div style={{ minWidth: 240 }} className="border-r pr-4">
          <div className="text-sm text-slate-600 mb-2">Usuarios</div>
          {loading && <div className="text-sm text-slate-500">Cargando...</div>}
          {!loading && users.length === 0 && <div className="text-sm text-slate-500">No hay usuarios.</div>}
          <ul>
            {users.map(u => (
              <li key={u.id}>
                <button
                  className={`text-left w-full py-2 pr-2 ${selectedUser?.id === u.id ? "font-semibold text-slate-800" : "text-slate-700"}`}
                  onClick={() => selectUser(u)}
                >
                  <span>{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          {!selectedUser && <div className="text-sm text-slate-500">Selecciona un usuario para ver detalles</div>}

          {selectedUser && (
            <div>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">Información de usuario</div>
                  <div className="font-medium text-lg">{selectedUser.fullName ?? selectedUser.userName ?? selectedUser.id}</div>
                  {selectedUser.createdAt && <div className="text-xs text-slate-400 mt-1">Creado: {new Date(selectedUser.createdAt).toLocaleString()}</div>}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={handleDeleteUser}
                    className="text-sm text-rose-600"
                    disabled={deleting}
                  >
                    {deleting ? "Eliminando..." : "Eliminar usuario"}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-600 mb-2">Roles de {selectedUser.fullName ?? selectedUser.userName ?? selectedUser.email}</div>
                <div className="flex gap-2 flex-wrap mb-3">
                  {(selectedUser.roles || []).length === 0 && <div className="text-sm text-slate-500">Sin roles</div>}
                  {(selectedUser.roles || []).map(r => (
                    <div key={r} className="px-3 py-1 bg-slate-100 rounded flex items-center gap-2 text-sm">
                      <span>{r}</span>
                      <button
                        onClick={() => handleRemoveRole(r)}
                        className="text-xs text-rose-600"
                        title={`Quitar rol ${r}`}
                        disabled={saving}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="border px-3 py-1 rounded"
                  >
                    <option value="">Seleccionar rol...</option>
                    {availableRoles
                      .filter(r => !(selectedUser.roles || []).includes(r))
                      .map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddRole}
                    className="bg-emerald-600 text-white px-3 py-1 rounded disabled:opacity-60"
                    disabled={!newRole || saving}
                  >
                    {saving ? "Guardando..." : "Agregar rol"}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-400">
                Puedes asignar varios roles a un usuario. Los cambios se aplican inmediatamente.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}