import { useEffect, useState } from "react";
import { bankService } from "../../services/bankService";
import { Bank } from "../../types/bank";

/**
 * BanksManager (corregido)
 * - Normaliza la respuesta de bankService.getAll()
 * - Al guardar (handleSave) toma el banco actualizado desde el state para asegurar que
 *   enviamos el color más reciente.
 */

export default function BanksManager() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [name, setName] = useState("");
  const [entity, setEntity] = useState("");
  const [color, setColor] = useState("#00A86B");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await bankService.getAll();
      // Normalizamos: si el servicio devuelve axios Response -> res.data, si devuelve directamente data -> res
      const data = (res as any)?.data ?? res;
      setBanks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading banks", err);
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) {
      alert("Introduce el nombre del banco");
      return;
    }
    setCreating(true);
    try {
      await bankService.create({ name: name.trim(), entity: entity.trim() || undefined, color });
      setName("");
      setEntity("");
      setColor("#00A86B");
      await load();
    } catch (err) {
      console.error("Error creating bank", err);
      alert("No se pudo crear el banco");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: string) {
    // Tomamos la versión más reciente desde el state (asegura color actualizado)
    const current = banks.find((x) => x.id === id);
    if (!current) return;
    setSavingId(id);
    try {
      // Enviar payload completo para evitar validaciones 400 en backend
      await bankService.update(id, {
        name: current.name,
        entity: (current.entity as string) ?? undefined,
        color: (current.color as string) ?? undefined,
      });
      await load();
    } catch (err) {
      console.error("Error updating bank", err);
      alert("No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar banco?")) return;
    try {
      await bankService.remove(id);
      await load();
    } catch (err) {
      console.error("Error deleting bank", err);
      alert("No se pudo eliminar");
    }
  }

  return (
    <div>
      {/* Add form — compact and inline */}
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center gap-3">
        <input
          className="border px-3 py-2 rounded w-full md:w-72"
          placeholder="Nombre banco"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border px-3 py-2 rounded w-full md:w-56"
          placeholder="Entidad"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            aria-label="Color banco"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 p-0 border rounded"
          />
          <button
            onClick={handleAdd}
            className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={creating}
          >
            {creating ? "Creando..." : "Agregar"}
          </button>
        </div>
      </div>

      {/* Banks list */}
      <div className="divide-y">
        {loading && <div className="text-sm text-slate-500 py-4">Cargando bancos...</div>}
        {!loading && banks.length === 0 && <div className="text-sm text-slate-500 py-4">No hay bancos registrados.</div>}

        {banks.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-4">
              <div style={{ backgroundColor: b.color ?? "#CBD5E1" }} className="w-10 h-10 rounded-md border" />
              <div>
                <input
                  className="font-medium text-slate-800 bg-transparent border-0 p-0"
                  value={b.name}
                  onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))}
                />
                <div className="text-sm text-slate-500">
                  <input
                    className="bg-transparent border-0 p-0 text-sm text-slate-500"
                    value={b.entity ?? ""}
                    onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, entity: e.target.value } : x)))}
                  />
                </div>
              </div>
            </div>

            {/* Controls: color picker + Guardar + Eliminar */}
            <div className="flex items-center gap-3">
              <input
                aria-label={`Color para ${b.name}`}
                type="color"
                value={b.color ?? "#00A86B"}
                onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, color: e.target.value } : x)))}
                className="w-10 h-10 p-0 border rounded"
              />
              <button
                onClick={() => handleSave(b.id)}
                className="bg-emerald-600 text-white px-3 py-2 rounded text-sm disabled:opacity-60"
                disabled={savingId === b.id}
              >
                {savingId === b.id ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => handleDelete(b.id)} className="text-red-600 text-sm">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}