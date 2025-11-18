// src/components/Settings/CategoriesManager.tsx
import { useEffect, useState } from 'react';
import { CategoriesService } from '../../services/categoriesService';

type Category = {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
};

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await CategoriesService.getAll();
      const data = resp?.data ?? resp;
      setCategories(data || []);
    } catch (e) {
      console.error('Error loading categories', e);
      setError('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setIsActive(true);
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || '');
    setIsActive(!!c.isActive);
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    try {
      if (editing) {
        await CategoriesService.update(editing.id, {
          name,
          description,
          isActive,
        });
      } else {
        await CategoriesService.create({
          name,
          description,
          isActive,
        });
      }
      await load();
      startCreate();
    } catch (e) {
      console.error('Error guardando categoría', e);
      setError('Error guardando categoría');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar esta categoría?')) return;
    try {
      await CategoriesService.delete(id);
      await load();
    } catch (e) {
      console.error('Error borrando categoría', e);
      alert('No se pudo eliminar la categoría');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Gestiona las categorías que usas en la aplicación.
          </p>
        </div>
        <div>
          <button
            onClick={startCreate}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Nueva categoría
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <h3 className="font-medium mb-2">Crear / Editar</h3>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Descripción</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm">Activo</label>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={save}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Guardar
              </button>
              <button
                onClick={startCreate}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <h3 className="font-medium mb-2">Listado</h3>
          {loading ? (
            <div>Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-slate-500">No hay categorías</div>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    {c.description && <div className="text-sm text-slate-500">{c.description}</div>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="px-3 py-1 border rounded hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}