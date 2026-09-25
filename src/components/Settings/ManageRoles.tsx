import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Gestión de roles (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            Usuarios
          </div>
          {loading && <p className="px-2 py-3 text-sm text-muted-foreground">Cargando...</p>}
          {!loading && users.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No hay usuarios.</p>}
          <ul className="space-y-1">
            {users.map(u => (
              <li key={u.id}>
                <Button
                  className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                  variant={selectedUser?.id === u.id ? "secondary" : "ghost"}
                  onClick={() => selectUser(u)}
                >
                  <span className="truncate">{u.email}</span>
                </Button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 rounded-lg border p-5">
          {!selectedUser && <p className="text-sm text-muted-foreground">Selecciona un usuario para ver detalles</p>}

          {selectedUser && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Información de usuario</p>
                  <p className="mt-1 text-lg font-semibold">{selectedUser.fullName ?? selectedUser.userName ?? selectedUser.id}</p>
                  {selectedUser.createdAt && <p className="mt-1 text-xs text-muted-foreground">Creado: {new Date(selectedUser.createdAt).toLocaleString()}</p>}
                </div>
                <Button onClick={handleDeleteUser} variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? "Eliminando..." : "Eliminar usuario"}
                </Button>
              </div>

              <div className="space-y-3 border-t pt-5">
                <Label>Roles de {selectedUser.fullName ?? selectedUser.userName ?? selectedUser.email}</Label>
                <div className="flex flex-wrap gap-2">
                  {(selectedUser.roles || []).length === 0 && <p className="text-sm text-muted-foreground">Sin roles</p>}
                  {(selectedUser.roles || []).map(r => (
                    <div key={r} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
                      <span>{r}</span>
                      <Button
                        onClick={() => handleRemoveRole(r)}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1 text-xs"
                        title={`Quitar rol ${r}`}
                        disabled={saving}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Seleccionar rol...</option>
                    {availableRoles
                      .filter(r => !(selectedUser.roles || []).includes(r))
                      .map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                  </select>
                  <Button onClick={handleAddRole} disabled={!newRole || saving}>
                    {saving ? "Guardando..." : "Agregar rol"}
                  </Button>
                </div>
              </div>

              <p className="border-t pt-4 text-xs text-muted-foreground">
                Puedes asignar varios roles a un usuario. Los cambios se aplican inmediatamente.
              </p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
