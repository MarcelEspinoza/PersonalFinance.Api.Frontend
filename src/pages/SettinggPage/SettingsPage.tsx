import {
  Landmark,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import BanksManager from "../../components/Settings/BanksManager";
import CategoriesManager from "../../components/Settings/CategoriesManager";
import ExpensePlanningManager from "../../components/Settings/ExpensePlanningManager";
import ManageRoles from "../../components/Settings/ManageRoles";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

type SettingsTab = "planning" | "banks" | "categories" | "admin";

type TabDefinition = {
  id: SettingsTab;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: LucideIcon;
};

const tabs: TabDefinition[] = [
  {
    id: "planning",
    title: "Planificación mensual",
    shortTitle: "Planificación",
    subtitle: "Define ingresos y gastos fijos, además de estimaciones para los variables.",
    icon: SlidersHorizontal,
  },
  {
    id: "banks",
    title: "Cuentas bancarias",
    shortTitle: "Cuentas",
    subtitle: "Configura el nombre, la entidad y el color de cada cuenta.",
    icon: Landmark,
  },
  {
    id: "categories",
    title: "Categorías",
    shortTitle: "Categorías",
    subtitle: "Gestiona las categorías de gastos e ingresos.",
    icon: Tags,
  },
  {
    id: "admin",
    title: "Administración",
    shortTitle: "Administración",
    subtitle: "Gestiona los roles y usuarios de la aplicación.",
    icon: ShieldCheck,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("Admin");
  const availableTabs = tabs.filter((tab) => tab.id !== "admin" || isAdmin);
  const [activeTab, setActiveTab] = useState<SettingsTab>("planning");
  const active = availableTabs.find((tab) => tab.id === activeTab) ?? availableTabs[0];
  const ActiveIcon = active.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Selecciona una sección para trabajar sin perderte en una página larga."
      />

      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="flex gap-2 overflow-x-auto rounded-xl border bg-muted/35 p-2"
      >
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex min-w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.shortTitle}</span>
            </button>
          );
        })}
      </div>

      <Card
        id={`settings-panel-${active.id}`}
        role="tabpanel"
        className="overflow-hidden"
      >
        <div className="border-b bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <ActiveIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">{active.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{active.subtitle}</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 sm:p-6">
          {active.id === "planning" && <ExpensePlanningManager />}
          {active.id === "banks" && <BanksManager />}
          {active.id === "categories" && <CategoriesManager />}
          {active.id === "admin" && isAdmin && <ManageRoles />}
        </CardContent>
      </Card>
    </div>
  );
}
