import type { ReactNode } from "react";
import { Wallet } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Layout partido: panel de marca a la izquierda (oculto en móvil) + formulario centrado. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary-foreground/10 p-1.5">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">Mi Finanzas</span>
        </div>
        <div className="space-y-3">
          <p className="text-2xl font-medium leading-snug">
            Todas tus cuentas, presupuestos y previsiones en un solo sitio.
          </p>
          <p className="text-sm text-primary-foreground/70">
            Simple, claro y siempre bajo tu control.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">© {new Date().getFullYear()} Mi Finanzas</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="rounded-md bg-primary p-1.5">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Mi Finanzas</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
