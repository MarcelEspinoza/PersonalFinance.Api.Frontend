import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CategoriesService } from "../../services/categoriesService";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      console.error("Error loading categories", e);
      setError("Error al cargar categorÃ­as");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || "");
    setIsActive(!!c.isActive);
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
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
      console.error("Error guardando categorÃ­a", e);
      setError("Error guardando categorÃ­a");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Â¿Seguro que quieres eliminar esta categorÃ­a?")) return;
    try {
      await CategoriesService.delete(id);
      await load();
    } catch (e) {
      console.error("Error borrando categorÃ­a", e);
      alert("No se pudo eliminar la categorÃ­a");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Gestiona las categorÃ­as que usas en la aplicaciÃ³n.
        </p>
        <Button onClick={startCreate}>Nueva categorÃ­a</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4 text-muted-foreground" />
              Crear / Editar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <div className="rounded-lg border bg-muted px-3 py-2 text-sm">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">DescripciÃ³n</Label>
              <Input id="category-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border" />
              Activo
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={save}>Guardar</Button>
              <Button onClick={startCreate} variant="outline">Cancelar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay categorÃ­as</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {categories.map((c) => (
                  <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button onClick={() => startEdit(c)} variant="outline" size="sm">Editar</Button>
                      <Button onClick={() => remove(c.id)} variant="destructive" size="sm">Borrar</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
