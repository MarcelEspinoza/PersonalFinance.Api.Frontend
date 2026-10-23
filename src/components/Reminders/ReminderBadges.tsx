import { Check, Mail, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import { URGENCY_LABEL, type ReminderUrgency } from "./reminderUtils";

const BADGE = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4";

const URGENCY_CLASS: Record<ReminderUrgency, string> = {
  overdue: "bg-negative-soft text-negative",
  today: "bg-warning-soft text-warning",
  soon: "bg-sky-500/10 text-sky-700",
};

export function UrgencyBadge({ urgency, className }: { urgency: ReminderUrgency; className?: string }) {
  return <span className={cn(BADGE, URGENCY_CLASS[urgency], className)}>{URGENCY_LABEL[urgency]}</span>;
}

export function AiBadge({ className }: { className?: string }) {
  return (
    <span className={cn(BADGE, "bg-violet-500/10 text-violet-700", className)} title="Lo propuso el asistente y tú lo confirmaste">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      IA
    </span>
  );
}

export function DoneBadge({ className }: { className?: string }) {
  return (
    <span className={cn(BADGE, "bg-positive-soft text-positive", className)}>
      <Check className="h-3 w-3" aria-hidden="true" />
      Hecho
    </span>
  );
}

export function EmailIndicator({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} title="También te avisa por correo">
      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {withLabel ? "Correo" : <span className="sr-only">También por correo</span>}
    </span>
  );
}
