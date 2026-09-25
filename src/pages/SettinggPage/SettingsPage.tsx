import React, { useEffect, useState } from "react";
import { ChevronDown, Landmark, ShieldCheck, Tags } from "lucide-react";
import BanksManager from "../../components/Settings/BanksManager";
import CategoriesManager from "../../components/Settings/CategoriesManager";
import ManageRoles from "../../components/Settings/ManageRoles";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";

function AccordionCard({
  id,
  title,
  subtitle,
  defaultOpen = false,
  children,
  onToggle,
}: {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  onToggle?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  useEffect(() => {
    onToggle?.(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const Icon = id === "admin" ? ShieldCheck : id === "banks" ? Landmark : Tags;

  return (
    <Card className="overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="h-auto w-full justify-between rounded-none px-5 py-5 text-left hover:bg-accent"
      >
        <span className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <span>
            <span className="block text-lg font-medium text-foreground">{title}</span>
            {subtitle && <span className="mt-1 block text-sm font-normal text-muted-foreground">{subtitle}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-normal text-muted-foreground">
          {open ? "Ocultar" : "Mostrar"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </Button>

      {open && <CardContent className="border-t p-5 sm:p-6">{children}</CardContent>}
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("Admin");

  return (
    <div className="space-y-8">
      <PageHeader title="Configuración" />

      <div className="space-y-4">
        {isAdmin && (
          <AccordionCard id="admin" title="Administración" subtitle="Gestión de roles y usuarios" defaultOpen={false}>
            <ManageRoles />
          </AccordionCard>
        )}

        <AccordionCard
          id="banks"
          title="Cuentas bancarias"
          subtitle="Configura nombre, entidad y color representativo de cada banco"
          defaultOpen={true}
        >
          <BanksManager />
        </AccordionCard>

        <AccordionCard id="categories" title="Categorías" subtitle="Gestiona categorías de gastos e ingresos" defaultOpen={false}>
          <CategoriesManager />
        </AccordionCard>
      </div>
    </div>
  );
}
