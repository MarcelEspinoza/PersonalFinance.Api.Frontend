import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoriesService } from "../../services/categoriesService";

interface Category {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CategoriesService.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError("Error al cargar las categorías");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Ya existe una categoría con ese nombre.");
      return;
    }

    try {
      setIsCreating(true);
      const newCategory = await CategoriesService.create({
        name,
        description: "",
        isActive: true,
      });
      setCategories((prev) => [...prev, newCategory]);
      setNewCategoryName("");
    } catch (err) {
      console.error("Error creating category:", err);
      alert("Error al crear la categoría");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: number, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("El nombre no puede estar vacío");
      return;
    }

    try {
      await CategoriesService.update(id, { name: trimmedName });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: trimmedName } : c))
      );
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      console.error("Error updating category:", err);
      alert("Error al actualizar la categoría");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

    try {
      await CategoriesService.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Error al eliminar la categoría");
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-slate-500">Cargando categorías...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new category */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nueva categoría"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          disabled={isCreating}
        />
        <button
          onClick={handleCreate}
          disabled={isCreating || !newCategoryName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Crear
        </button>
      </div>

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          No hay categorías. Crea una nueva para comenzar.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              {editingId === category.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdate(category.id, editingName);
                      } else if (e.key === "Escape") {
                        cancelEditing();
                      }
                    }}
                    className="flex-1 px-3 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(category.id, editingName)}
                    className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-slate-800">{category.name}</span>
                  <button
                    onClick={() => startEditing(category)}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded transition"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
