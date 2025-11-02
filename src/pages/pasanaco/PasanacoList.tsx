import { Trash2 } from "lucide-react";
import { Pasanaco } from "../../services/pasanacoService";

interface PasanacoListProps {
  pasanacos: Pasanaco[];
  selectedPasanaco: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PasanacoList({
  pasanacos,
  selectedPasanaco,
  loading,
  onSelect,
  onDelete,
}: PasanacoListProps) {
  if (loading) return <p>Cargando...</p>;
  if (pasanacos.length === 0)
    return <p className="text-slate-500">No hay pasanacos</p>;

  return (
    <>
      {pasanacos.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`p-4 border rounded-xl mb-2 cursor-pointer ${
            selectedPasanaco === p.id
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-200"
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">{p.name}</p>
              <p className="text-sm text-slate-600">
                {p.total_participants} participantes
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(p.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
