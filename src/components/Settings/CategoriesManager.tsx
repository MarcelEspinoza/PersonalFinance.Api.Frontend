import { Pencil, Plus, Trash2, X } from "lucide-react";
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
  const [editName, setEditName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await CategoriesService.getAll();
      setCategories((response.data || []) as Category[]);
    } catch (err) {
      setError("Error al cargar las categorías");
      console.error("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      alert("El nombre de la categoría no puede estar vacío");
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      alert("Ya existe una categoría con ese nombre");
      return;
    }

    try {
      const response = await CategoriesService.create({
        name: newCategoryName.trim(),
        description: "",
        isActive: true,
      });
      setCategories((prev) => [...prev, response.data]);
      setNewCategoryName("");
      setIsCreating(false);
    } catch (err) {
      alert("Error al crear la categoría");
      console.error("Error creating category:", err);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) {
      alert("El nombre de la categoría no puede estar vacío");
      return;
    }

    const existingCategory = categories.find(
      (c) => c.name.toLowerCase() === editName.toLowerCase() && c.id !== id
    );

    if (existingCategory) {
      alert("Ya existe una categoría con ese nombre");
      return;
    }

    try {
      await CategoriesService.update(id, { name: editName.trim() });
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, name: editName.trim() } : cat))
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      alert("Error al actualizar la categoría");
      console.error("Error updating category:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría?")) {
      return;
    }

    try {
      await CategoriesService.delete(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      alert("Error al eliminar la categoría");
      console.error("Error deleting category:", err);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  if (loading) {
    return <div className="text-center py-8">Cargando categorías...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
        <button
          onClick={loadCategories}
          className="ml-4 text-blue-600 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-600">
          Administra las categorías para tus transacciones
        </p>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Categoría
          </button>
        )}
      </div>

      {isCreating && (
        <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              }
            }}
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            Crear
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewCategoryName("");
            }}
            className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-center py-8 text-slate-500">
            No hay categorías. Crea una para comenzar.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
            >
              {editingId === category.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleUpdate(category.id);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleUpdate(category.id)}
                      className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-slate-800 font-medium">
                    {category.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
