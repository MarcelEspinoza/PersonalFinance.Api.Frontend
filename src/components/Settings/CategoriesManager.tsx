import { useEffect, useState } from "react";
import { CategoriesService } from "../../services/categoriesService";

type Category = { id: number; name: string; description?: string; isActive?: boolean };

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeResponse = (resp: any) => {
    if (!resp) return [];
    return resp.data ?? resp;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await CategoriesService.getAll();
      const data = normalizeResponse(resp);
      setCategories(data || []);
    } catch (e) {
      console.error("Error loading categories", e);
      setError("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing(null); setName(""); setDescription(""); setIsActive(true); };
  const startEdit = (c: Category) => { setEditing(c); setName(c.name); setDescription(c.description || ""); setIsActive(!!c.isActive); };

  const save = async () => {
    setError(null);
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    try {
      if (editing) {
        await CategoriesService.update(editing.id, { name, description, isActive });
      } else {
        await CategoriesService.create({ name, description, isActive });
      }
      await load();
      startCreate();
    } catch (e) {
      console.error("Error guardando categoría", e);
      setError("Error guardando categoría");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar esta categoría?")) return;
    try { await CategoriesService.delete(id); await load(); } catch (e) { console.error("Error borrando categoría", e); alert("No se pudo eliminar la categoría"); }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-lg space-y-4">
        <h3 className="font-semibold text-slate-700">
          {editing ? "Editar Categoría" : "Nueva Categoría"}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Alimentación"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <label className="ml-2 text-sm text-slate-700">Activa</label>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            {editing ? "Actualizar" : "Crear"}
          </button>
          {editing && (
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Categorías Existentes</h3>
        {loading ? (
          <p className="text-slate-600">Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="text-slate-600">No hay categorías aún.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-800">{cat.name}</p>
                  {cat.description && (
                    <p className="text-sm text-slate-600">{cat.description}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {cat.isActive ? "Activa" : "Inactiva"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(cat)}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(cat.id)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
