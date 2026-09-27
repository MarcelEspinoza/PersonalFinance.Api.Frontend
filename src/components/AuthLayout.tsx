import type { ReactNode } from "react";
import { BarChart3, LockKeyhole, Sparkles, Wallet } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090b12] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 -top-36 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-48 right-0 h-[36rem] w-[36rem] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden flex-col justify-between p-12 lg:flex xl:p-16">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 shadow-2xl shadow-indigo-500/10 backdrop-blur">
              <Wallet className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Mi Finanzas</div>
              <div className="text-xs text-white/40">Control financiero personal</div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Claridad para cada decisión
            </div>
            <h2 className="text-5xl font-medium leading-[1.08] tracking-[-0.04em] xl:text-6xl">
              Tu dinero,
              <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                explicado con calma.
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
              Cuentas, movimientos, presupuestos y previsiones en un espacio diseñado para entender,
              no solo para registrar.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
                <BarChart3 className="mb-3 h-5 w-5 text-indigo-300" />
                <div className="text-sm font-medium">Visión completa</div>
                <div className="mt-1 text-xs leading-5 text-white/40">Todo tu panorama financiero, sin ruido.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
                <LockKeyhole className="mb-3 h-5 w-5 text-violet-300" />
                <div className="text-sm font-medium">Bajo tu control</div>
                <div className="mt-1 text-xs leading-5 text-white/40">Tus decisiones siempre requieren confirmación.</div>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/30">© {new Date().getFullYear()} Mi Finanzas</p>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="rounded-xl border border-white/10 bg-white/10 p-2.5">
                <Wallet className="h-5 w-5 text-indigo-300" />
              </div>
              <span className="font-semibold tracking-tight">Mi Finanzas</span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.96] p-6 text-slate-950 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="mb-3 h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                <h1 className="text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
              </div>
              {children}
            </div>

            <p className="mt-5 text-center text-xs text-white/30">
              Acceso seguro · Datos privados · Sin publicidad
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
