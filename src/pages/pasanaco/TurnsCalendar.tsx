import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { shortMonthLabel } from "./pasanacoFormat";

export type CalendarTurn = {
  number: number;
  name?: string;
  month: number;
  year: number;
  status: "done" | "current" | "upcoming";
};

const statusText: Record<CalendarTurn["status"], string> = {
  done: "Ya cobró",
  current: "Cobra este mes",
  upcoming: "Por cobrar",
};

export function TurnsCalendar({ turns }: { turns: CalendarTurn[] }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Calendario de turnos</h3>
        <p className="text-xs text-muted-foreground">Quién cobra el bote cada mes</p>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {turns.map((turn) => (
          <li
            key={turn.number}
            aria-current={turn.status === "current" ? "step" : undefined}
            className={cn(
              "overflow-hidden rounded-lg border text-center",
              turn.status === "current" && "border-primary shadow-sm ring-1 ring-primary",
            )}
          >
            <div
              className={cn(
                "py-1 text-[11px] font-semibold uppercase tracking-wider",
                turn.status === "current" && "bg-primary text-primary-foreground",
                turn.status === "done" && "bg-positive-soft text-positive",
                turn.status === "upcoming" && "bg-muted text-muted-foreground",
              )}
            >
              {shortMonthLabel(turn.month, turn.year)}
            </div>
            <div className={cn("px-2 pb-2 pt-1.5", turn.status === "done" && "text-muted-foreground")}>
              <div className="text-2xl font-semibold tabular-nums leading-tight">{turn.number}</div>
              <div className={cn("truncate text-sm font-medium", turn.status !== "done" && "text-foreground")} title={turn.name}>
                {turn.name ?? "Sin asignar"}
              </div>
              <div
                className={cn(
                  "mt-0.5 flex items-center justify-center gap-1 text-xs",
                  turn.status === "current" && "font-medium text-primary",
                  turn.status === "done" && "text-positive",
                )}
              >
                {turn.status === "done" && <Check className="h-3 w-3" />}
                {statusText[turn.status]}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
