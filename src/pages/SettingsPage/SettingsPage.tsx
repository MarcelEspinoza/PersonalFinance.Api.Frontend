import { CategoriesManager } from "../../components/Settings/CategoriesManager";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-600 mt-2">Administra la configuración de tu aplicación</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Categorías</h2>
        <CategoriesManager />
      </div>
    </div>
  );
}
