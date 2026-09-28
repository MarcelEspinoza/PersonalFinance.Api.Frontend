import { CheckCircle2, CircleDashed, Unlock } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  status: "notOpened" | "open" | "closed";
  closedAt?: string | null;
  className?: string;
};

export function PeriodStatusBadge({ status, closedAt, className }: Props) {
  if (status === "closed") {
    const date = closedAt ? new Date(closedAt).toLocaleDateString("es-ES") : null;
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-3 py-1 text-xs font-semibold text-positive",
        className,
      )}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Mes cerrado{date ? ` el ${date}` : ""}
      </span>
    );
  }

  if (status === "open") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning",
        className,
      )}>
        <Unlock className="h-3.5 w-3.5" />
        Mes abierto
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground",
      className,
    )}>
      <CircleDashed className="h-3.5 w-3.5" />
      Sin empezar
    </span>
  );
}
