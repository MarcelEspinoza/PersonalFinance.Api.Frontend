import { useEffect, useState } from "react";
import { bankService } from "../../services/bankService";
import { Bank } from "../../types/bank";

export default function BanksManager() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [name, setName] = useState("");
  const [inst, setInst] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await bankService.getAll();
      setBanks(data);
    } catch (err) { console.error(err); }
  }

  async function handleAdd() {
    if (!name) return;
    try {
      await bankService.create({ name, institution: inst });
      setName(""); setInst("");
      load();
    } catch (err) {
      console.error("Error creating bank", err);
      alert("No se pudo crear el banco");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar banco?")) return;
    try {
      await bankService.remove(id);
      load();
    } catch (err) {
      console.error("Error deleting bank", err);
      alert("No se pudo eliminar");
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input className="border px-2 py-1" placeholder="Nombre banco" value={name} onChange={e => setName(e.target.value)} />
        <input className="border px-2 py-1" placeholder="Institución" value={inst} onChange={e => setInst(e.target.value)} />
        <button onClick={handleAdd} className="bg-emerald-600 text-white px-3 rounded">Agregar</button>
      </div>

      <ul>
        {banks.map(b => (
          <li key={b.id} className="flex justify-between items-center py-2 border-b">
            <div>
              <div className="font-medium">{b.name}</div>
              <div className="text-sm text-slate-500">{b.institution}</div>
            </div>
            <div>
              <button onClick={() => handleDelete(b.id)} className="text-red-600">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}