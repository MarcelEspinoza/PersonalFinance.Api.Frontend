
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
  if (!hex) return `rgba(203,213,225,${a})`; // slate fallback
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function BanksChips({ recons, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      {recons.map(r => {
        // if reconciled: use a soft translucent bg of the bank color; otherwise light card
        const bg = r.reconciled ? hexToRgba(r.bankColor, 0.14) : "#ffffff";
        const border = r.reconciled ? hexToRgba(r.bankColor, 0.28) : "#E6E9EE";
        // text color: dark for contrast, but if reconciled we keep dark text
        const textColor = r.reconciled ? "#06313a" : undefined;

        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            title={r.label}
            className={`px-3 py-2 rounded-full flex items-center gap-2 text-sm border transition-all`}
            style={{
              backgroundColor: bg,
              borderColor: border,
              color: textColor,
              // softer elevation than before
              boxShadow: selectedId === r.id ? "0 8px 18px rgba(3,7,18,0.06)" : "none",
              transform: selectedId === r.id ? "translateY(-1px)" : undefined,
            }}
          >
            {/* colored dot (slightly tinted) */}
            <span
              style={{
                backgroundColor: r.bankColor ? hexToRgba(r.bankColor, 0.95) : "#CBD5E1",
                width: 10,
                height: 10,
                borderRadius: 999,
                display: "inline-block",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.6)",
              }}
            />
            <span className="font-medium" style={{ color: textColor }}>{r.label}</span>
            {r.reconciled && (
              <span
                style={{
                  // small dark badge so it is readable over soft-bg
                  backgroundColor: hexToRgba("#16A34A", 0.75),
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                Conciliado
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}