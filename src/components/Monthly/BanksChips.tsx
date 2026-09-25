import { cn } from "../../lib/utils";

type Chip = {
  id: string;
  label: string;
  bankColor?: string;
  reconciled?: boolean;
};

type Props = {
  recons: Chip[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

function hexToRgba(hex?: string, a = 1) {
  if (!hex) return undefined;
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function BanksChips({ recons, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {recons.map((r) => {
        const isSelected = selectedId === r.id;
        const backgroundColor = r.reconciled ? hexToRgba(r.bankColor, 0.14) : undefined;
        const borderColor = r.reconciled ? hexToRgba(r.bankColor, 0.28) : undefined;

        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            title={r.label}
            className={cn(
              "flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-accent",
              isSelected && "ring-1 ring-ring"
            )}
            style={{ backgroundColor, borderColor }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full bg-muted"
              style={{ backgroundColor: r.bankColor }}
            />
            <span className="font-medium">{r.label}</span>
            {r.reconciled && <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">Conciliado</span>}
          </button>
        );
      })}
    </div>
  );
}
