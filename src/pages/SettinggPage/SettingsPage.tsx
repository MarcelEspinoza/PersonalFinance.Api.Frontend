import BanksManager from "../../components/Settings/BanksManager";
import CategoriesManager from "../../components/Settings/CategoriesManager";
import ManageRoles from "../../components/Settings/ManageRoles";
import { useAuth } from "../../contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("Admin");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
      </header>

      {isAdmin && (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Administración</h2>
          <ManageRoles />
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Cuentas bancarias</h2>
        <BanksManager />
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Categorías</h2>
        <CategoriesManager />
      </section>
      
    </div>
  );
}