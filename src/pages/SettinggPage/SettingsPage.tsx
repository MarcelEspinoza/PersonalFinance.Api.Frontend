import React, { useEffect, useState } from "react";
import BanksManager from "../../components/Settings/BanksManager";
import CategoriesManager from "../../components/Settings/CategoriesManager";
import ManageRoles from "../../components/Settings/ManageRoles";
import { useAuth } from "../../contexts/AuthContext";

/**
 * SettingsPage (mejorada)
 * - AccordionCard ahora alinea título/ subtítulo a la izquierda (no centrado).
 * - Mantiene BanksManager (ahora con editor de color inline).
 * - Mantiene CategoriesManager y ManageRoles.
 */

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

  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* NOTE: items-start + text-left => ensures left alignment */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between p-5 hover:bg-slate-50 transition"
      >
        <div className="text-left">
          <div className="text-lg font-medium text-slate-800">{title}</div>
          {subtitle && <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        <div className="text-sm text-slate-500">{open ? "Ocultar" : "Mostrar"}</div>
      </button>

      <div className={`transition-all duration-200 ${open ? "max-h-[2000px] p-6" : "max-h-0 p-0"}`}>
        <div className={`${open ? "opacity-100" : "opacity-0"} transition-opacity`}>{children}</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("Admin");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
      </header>

      {isAdmin && (
        <AccordionCard id="admin" title="Administración" subtitle="Gestión de roles y usuarios" defaultOpen={false}>
          <div className="mb-4">
            <ManageRoles />
          </div>
        </AccordionCard>
      )}

      <AccordionCard
        id="banks"
        title="Cuentas bancarias"
        subtitle="Configura nombre, entidad y color representativo de cada banco"
        defaultOpen={true}
      >
        <div className="mb-6">
          <BanksManager />
        </div>
      </AccordionCard>

      <AccordionCard id="categories" title="Categorías" subtitle="Gestiona categorías de gastos e ingresos" defaultOpen={false}>
        <CategoriesManager />
      </AccordionCard>
    </div>
  );
}