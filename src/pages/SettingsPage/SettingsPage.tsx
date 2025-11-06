import { CategoriesManager } from "../../components/Settings/CategoriesManager";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Configuración</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Gestión de Categorías</h2>
        <CategoriesManager />
      </div>
    </div>
  );
}
