import { Trash2 } from "lucide-react";
import { Pasanaco } from "../../services/pasanacoService";
import { getCurrentGameMonth } from "./PasanacoPage";

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
  if (loading) return <p className="text-muted-foreground">Cargando pasanacos...</p>;
  if (pasanacos.length === 0)
    return <p className="text-muted-foreground">No tienes pasanacos creados aún</p>;

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
                ? "bg-accent border"
                : "bg-card hover:bg-accent border"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-card-foreground">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.totalParticipants} participantes • Turno {p.currentRound}
                </p>
                <p className="text-xs text-muted-foreground">
                  Inicio: {month}/{year}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(p.id);
                }}
                className="p-2 hover:bg-negative-soft rounded-lg"
                title="Eliminar pasanaco"
              >
                <Trash2 className="w-4 h-4 text-negative" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}