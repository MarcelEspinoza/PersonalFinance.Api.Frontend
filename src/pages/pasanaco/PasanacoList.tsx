import { Trash2 } from "lucide-react";
import { Pasanaco } from "../../services/pasanacoService";

interface Props {
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
  
}: Props) {
  if (loading) return <p className="text-slate-500">Cargando pasanacos...</p>;
  if (pasanacos.length === 0)
    return <p className="text-slate-500">No tienes pasanacos creados aún</p>;

  return (
    <div className="space-y-3">
      {pasanacos.map((p) => {
        const { month, year } = getCurrentGameMonth(
          p.startMonth,
          p.startYear,
          p.currentRound
        );

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
              selectedPasanaco === p.id
                ? "bg-emerald-50 border-emerald-400"
                : "bg-white hover:bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">{p.name}</p>
                <p className="text-sm text-slate-600">
                  {p.totalParticipants} participantes • Turno {p.currentRound}
                </p>
                <p className="text-xs text-slate-500">
                  Inicio: {month}/{year}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(p.id);
                }}
                className="p-2 hover:bg-red-100 rounded-lg"
                title="Eliminar pasanaco"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Reutilizamos la lógica del mes actual
export function getCurrentGameMonth(startMonth: number, startYear: number, round: number) {
  if (
    typeof startMonth !== "number" ||
    typeof startYear !== "number" ||
    typeof round !== "number" ||
    startMonth < 1 ||
    startMonth > 12 ||
    startYear < 2000 ||
    round < 1
  ) {
    return { month: NaN, year: NaN };
  }

  const base = new Date(startYear, startMonth - 1);
  const current = new Date(base.setMonth(base.getMonth() + round - 1));
  return { month: current.getMonth() + 1, year: current.getFullYear() };
}


