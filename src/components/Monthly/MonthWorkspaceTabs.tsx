import { BarChart3, ClipboardList } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

type Props = {
  year: number;
  month: number;
};

const tabs = [
  {
    path: "/ledger",
    label: "Planificación",
    description: "Qué esperas cobrar y pagar",
    icon: ClipboardList,
  },
  {
    path: "/monthly",
    label: "Resumen y cuadre",
    description: "Qué ocurrió y si coincide con el banco",
    icon: BarChart3,
  },
];

export function MonthWorkspaceTabs({ year, month }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="grid gap-2 rounded-xl border bg-muted/30 p-1.5 sm:grid-cols-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(`${tab.path}?year=${year}&month=${month}`)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
            <span>
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="block text-xs">{tab.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
