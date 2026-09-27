import { Archive, CalendarDays, ChevronRight, Trash2, Users } from "lucide-react";
import { Pasanaco } from "../../services/pasanacoService";
import { getCurrentGameMonth } from "./PasanacoPage";

interface Props {
  pasanacos: Pasanaco[];
  selectedPasanaco: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  historical?: boolean;
}

export function PasanacoList({
  pasanacos,
  selectedPasanaco,
  loading,
  onSelect,
  onDelete,
  historical = false,
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
        const progress = Math.min(100, Math.max(0, (p.currentRound / p.totalParticipants) * 100));

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`group rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
              selectedPasanaco === p.id
                ? "border-primary/30 bg-primary/[0.06]"
                : "bg-card hover:border-primary/20 hover:bg-muted/50"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-card-foreground">{p.name}</p>
                  {historical
                    ? <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${selectedPasanaco === p.id ? "translate-x-0.5 text-primary" : "text-muted-foreground group-hover:translate-x-0.5"}`} />}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.totalParticipants}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{month}/{year}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Ronda {p.currentRound} de {p.totalParticipants}</p>
              </div>
              {!historical && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="ml-2 rounded-lg p-2 opacity-0 transition-opacity hover:bg-negative-soft group-hover:opacity-100 focus:opacity-100"
                  title="Eliminar pasanaco"
                >
                  <Trash2 className="w-4 h-4 text-negative" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}