import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";

type SectionCardProps = {
  title: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/** Dashboard block: a title bar (icon, title and an optional link on the right) above the content. */
export function SectionCard({ title, icon, subtitle, action, className, bodyClassName, children }: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </Card>
  );
}

export function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary hover:underline"
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

export function CountBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground tabular-nums",
        className,
      )}
    >
      {value}
    </span>
  );
}
