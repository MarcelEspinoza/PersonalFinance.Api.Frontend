import { Archive } from "lucide-react";
import { useState } from "react";
import { Pasanaco } from "../../services/pasanacoService";

interface Props {
  pasanacos: Pasanaco[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function PasanacoList({ pasanacos, selectedId, loading, onSelect }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (loading && pasanacos.length === 0) return <p className="text-sm text-muted-foreground">Cargando pasanacos…</p>;
  if (pasanacos.length === 0)
    return <p className="text-sm text-muted-foreground">Aún no tienes pasanacos. Crea uno con el botón de arriba.</p>;

  const completedCount = pasanacos.filter((p) => p.isCompleted).length;
  const visible = pasanacos.filter((p) => !p.isCompleted || showCompleted || p.id === selectedId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((p) => {
        const selected = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : p.isCompleted
                  ? "bg-muted text-muted-foreground hover:border-primary/30"
                  : "bg-card hover:border-primary/30"
            }`}
          >
            {p.isCompleted && <Archive className="h-3.5 w-3.5" />}
            {p.name}
            <span className={`text-xs font-normal ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {p.isCompleted ? "Finalizado" : `Turno ${p.currentRound} de ${p.totalParticipants}`}
            </span>
          </button>
        );
      })}
      {completedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowCompleted((value) => !value)}
          className="px-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showCompleted ? "Ocultar finalizados" : `Ver finalizados (${completedCount})`}
        </button>
      )}
    </div>
  );
}
