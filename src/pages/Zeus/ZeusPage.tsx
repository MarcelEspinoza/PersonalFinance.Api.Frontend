import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, Clock, Heart, Loader2, PawPrint, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { ConfirmEntryDialog, type ConfirmFormValues } from "../../components/Ledger/ConfirmEntryDialog";
import { chatErrorMessage } from "../../services/chatService";
import {
  ZeusService, duration, isCareForecast, type ZeusCareProvider, type ZeusCareStay,
  type ZeusExpense, type ZeusPass, type ZeusSummary, type ZeusUsage,
} from "../../services/zeusService";
import { EntryDirection, EntryStatus, type MonthlyEntry } from "../../types/ledger";
import { money, shortDate, today } from "../../utils/civilDate";
import { FormError, ZeusPurchaseDialog, ZeusUsageDialog } from "./ZeusForms";
import { ZeusCareDialog, ZeusCareSection } from "./ZeusCare";

export function ZeusPage() {
  const [summary, setSummary] = useState<ZeusSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [buying, setBuying] = useState(false);
  const [attendance, setAttendance] = useState<{ usage: ZeusUsage | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [provider, setProvider] = useState<ZeusCareProvider>("daycare");
  const [care, setCare] = useState<{ stay: ZeusCareStay | null } | null>(null);
  const [paymentStays, setPaymentStays] = useState<ZeusCareStay[] | null>(null);
  const [confirming, setConfirming] = useState<ZeusExpense | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const data = await ZeusService.get();
        if (active) { setSummary(data); setError(null); }
      } catch (err) {
        if (active) setError(chatErrorMessage(err, "No se pudieron cargar los bonos de Zeus."));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [reload]);

  const saved = (data: ZeusSummary, text: string) => {
    setSummary(data);
    setBuying(false);
    setAttendance(null);
    setCare(null);
    setPaymentStays(null);
    setConfirming(null);
    setConfirmError(null);
    setError(null);
    setMessage(text);
  };

  const removePass = async (pass: ZeusPass) => {
    if (!window.confirm(`¿Retirar el bono de ${duration(pass.minutes)} del ${shortDate(pass.purchasedOn)}? Su gasto de ${money(pass.expense.amount)} NO se borrará.`)) return;
    setBusy(pass.id);
    setError(null);
    try {
      saved(await ZeusService.removePass(pass.id), "Bono retirado. Su gasto se conserva en Mes.");
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo retirar el bono."));
    } finally {
      setBusy(null);
    }
  };

  const removeUsage = async (usage: ZeusUsage) => {
    if (!window.confirm(`¿Borrar las ${duration(usage.minutes)} registradas el ${shortDate(usage.date)}? Las horas volverán a estar disponibles.`)) return;
    setBusy(usage.id);
    setError(null);
    try {
      saved(await ZeusService.removeUsage(usage.id), "Registro eliminado. Las horas vuelven a estar disponibles.");
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo borrar el registro."));
    } finally {
      setBusy(null);
    }
  };

  const removeCare = async (stay: ZeusCareStay) => {
    if (!window.confirm(`¿Borrar el registro del ${shortDate(stay.date)}? ${isCareForecast(stay)
      ? "Se ajustará su previsión, o quedará descartada si ya no cubre otros cuidados."
      : "Si tiene un gasto ya pagado, ese gasto NO se borrará."}`)) return;
    setBusy(stay.id);
    setError(null);
    try {
      saved(await ZeusService.removeCare(stay.id), "Registro eliminado. Su previsión se ha ajustado si correspondía; los pagos reales se conservan.");
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo borrar la estancia."));
    } finally {
      setBusy(null);
    }
  };

  const unlinkCare = async (stay: ZeusCareStay) => {
    if (!window.confirm(isCareForecast(stay)
      ? "¿Quitar la previsión de este cuidado? Se reducirá su importe o quedará descartada si no cubre otros cuidados. No afecta al dinero real."
      : "¿Desvincular el pago de este registro? El gasto se conserva y no se devuelve dinero a la cuenta.")) return;
    setBusy(stay.id);
    setError(null);
    try {
      saved(await ZeusService.unlinkCarePayment(stay.id), "Vínculo quitado. Las previsiones se ajustan; los pagos reales se conservan.");
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo desvincular el pago."));
    } finally {
      setBusy(null);
    }
  };

  const confirmCare = async (values: ConfirmFormValues) => {
    if (!confirming) return;
    setBusy(confirming.id);
    setConfirmError(null);
    try {
      saved(await ZeusService.confirmCarePayment(confirming.id, values), "Pago confirmado. Se ha utilizado la previsión existente, sin crear otro gasto.");
    } catch (err) {
      setConfirmError(chatErrorMessage(err, "No se pudo confirmar el pago."));
    } finally {
      setBusy(null);
    }
  };

  const confirmingEntry: MonthlyEntry | null = confirming ? {
    id: confirming.id, direction: EntryDirection.Out, status: confirming.status ?? EntryStatus.Planned,
    dueDate: confirming.date, forecastAmount: confirming.amount, remaining: confirming.amount,
    description: confirming.description, accountName: confirming.accountName, fromRecurringRule: false,
  } : null;

  const usages = summary?.usages.filter(usage => usage.date.startsWith(month)) ?? [];
  const usedThisMonth = usages.filter(usage => !usage.isPlanned).reduce((total, usage) => total + usage.minutes, 0);
  const plannedThisMonth = usages.filter(usage => usage.isPlanned).reduce((total, usage) => total + usage.minutes, 0);
  const plannedMinutes = summary?.plannedMinutes ?? 0;
  const freeMinutes = (summary?.availableMinutes ?? 0) - plannedMinutes;
  const activePasses = summary?.passes.filter(pass => pass.remainingMinutes > 0) ?? [];
  const currentPass = [...activePasses].reverse()[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Zeus" description="Su guardería y su niñera, cada una con sus cuidados y sus pagos."
        actions={provider === "daycare" ? <Button variant="outline" onClick={() => setBuying(true)} disabled={!summary || !!busy || loading}><Plus className="mr-2 h-4 w-4" />Comprar bono</Button> : undefined} />
      <div className="flex flex-wrap gap-2" aria-label="Cuidador de Zeus">
        <Button variant={provider === "daycare" ? "default" : "outline"} aria-pressed={provider === "daycare"} onClick={() => setProvider("daycare")}><PawPrint className="mr-2 h-4 w-4" />Guardería</Button>
        <Button variant={provider === "alessia" ? "default" : "outline"} aria-pressed={provider === "alessia"} onClick={() => setProvider("alessia")}><Heart className="mr-2 h-4 w-4" />Alessia · Niñera</Button>
      </div>
      <FormError message={error} />
      {error && <Button variant="outline" onClick={() => setReload(value => value + 1)} disabled={loading}>Volver a cargar</Button>}
      {message && <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200">{message}</p>}
      {loading && <p role="status" className="flex gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando las horas de Zeus…</p>}
      {summary && !loading && provider === "daycare" && (
        <>
          <section aria-label="Horas disponibles" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 p-6 text-white sm:p-8">
            <PawPrint aria-hidden="true" className="pointer-events-none absolute -right-6 top-0 h-56 w-56 -rotate-12 text-white/10 sm:right-6" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"><PawPrint className="h-4 w-4" />El rincón de Zeus</p>
                <p className="text-sm text-teal-100">Horas que le quedan en la guardería</p>
                <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{duration(summary.availableMinutes)}</p>
                {plannedMinutes > 0 && (
                  <p className="mt-2 text-sm text-teal-50">
                    <strong>{duration(freeMinutes)}</strong> cuando pasen los días previstos ({duration(plannedMinutes)} previstas)
                  </p>
                )}
                <p className="mt-3 max-w-sm text-sm text-teal-50">
                  {summary.passes.length === 0 ? "Empieza con su primer bono. Después, solo anota las horas de cada día."
                    : `${activePasses.length} ${activePasses.length === 1 ? "bono con horas" : "bonos con horas"} · Sin caducidad`}
                </p>
              </div>
              <Button onClick={() => setAttendance({ usage: null })} disabled={freeMinutes <= 0 || !!busy}
                className="bg-white text-teal-900 hover:bg-teal-50">
                <Clock className="mr-2 h-4 w-4" />Registrar horas
              </Button>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={Ticket} label="Horas compradas" value={duration(summary.purchasedMinutes)} />
            <Metric icon={Clock} label="Horas utilizadas en total" value={duration(summary.usedMinutes)} />
            <Metric icon={Heart} label="Invertido en bonos de guardería" value={money(summary.totalSpent)} />
          </div>

          <section className="space-y-3" aria-labelledby="zeus-passes-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="zeus-passes-title" className="text-lg font-semibold">Sus bonos</h2>
              <p className="text-xs text-muted-foreground">Se usa primero el más antiguo</p>
            </div>
            {summary.passes.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 border-dashed p-8 text-center">
                <Ticket className="h-9 w-9 text-teal-600" />
                <p className="font-medium">Su próxima aventura empieza aquí</p>
                <p className="max-w-sm text-sm text-muted-foreground">Añade un bono de 60, 120 o las horas que compres. Vincula su gasto para llevar también el precio.</p>
                <Button onClick={() => setBuying(true)}>Añadir su primer bono</Button>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {summary.passes.map(pass => (
                  <Card key={pass.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><Ticket className="h-5 w-5" /></div>
                        <div>
                          <h3 className="font-semibold">Bono de {duration(pass.minutes)}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">{shortDate(pass.purchasedOn)} {pass.purchasedOn.slice(0, 4)} · {money(pass.expense.amount)}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${pass.remainingMinutes === 0 ? "bg-muted text-muted-foreground" : "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"}`}>
                        {pass.remainingMinutes === 0 ? "Agotado" : pass.id === currentPass?.id ? "En uso" : "Disponible"}
                      </span>
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between gap-2 text-sm">
                        <span><strong>{duration(pass.remainingMinutes)}</strong> disponibles</span>
                        <span className="text-muted-foreground">
                          {duration(pass.usedMinutes)} usadas{(pass.plannedMinutes ?? 0) > 0 && ` · ${duration(pass.plannedMinutes ?? 0)} previstas`}
                        </span>
                      </div>
                      <div role="progressbar" aria-label={`Horas disponibles del bono del ${shortDate(pass.purchasedOn)}`}
                        aria-valuemin={0} aria-valuemax={pass.minutes} aria-valuenow={pass.remainingMinutes}
                        aria-valuetext={duration(pass.remainingMinutes)} className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${100 * pass.remainingMinutes / pass.minutes}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <Link className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        to={`/ledger?year=${pass.expense.date.slice(0, 4)}&month=${Number(pass.expense.date.slice(5, 7))}`}>
                        Ver gasto · {pass.expense.accountName}<ArrowUpRight className="h-3 w-3" />
                      </Link>
                      <Button variant="ghost" size="sm" disabled={!!busy || pass.usedMinutes + (pass.plannedMinutes ?? 0) > 0}
                        title={pass.usedMinutes + (pass.plannedMinutes ?? 0) > 0 ? "Corrige primero las horas utilizadas o previstas para retirar el bono." : "Retirar el bono sin borrar el gasto"}
                        onClick={() => void removePass(pass)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />Retirar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="zeus-history-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="zeus-history-title" className="text-lg font-semibold">Sus días</h2>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" /><span className="sr-only">Mes del historial</span>
                <Input type="month" className="w-auto" min="2000-01" max="9998-12" value={month}
                  onChange={event => { if (event.target.value) setMonth(event.target.value); }} />
              </label>
            </div>
            <Card className="overflow-hidden">
              <div className="flex flex-wrap justify-between gap-2 border-b bg-muted/30 px-5 py-3 text-sm">
                <span>{new Set(usages.map(usage => usage.date)).size} días registrados este mes</span>
                <strong>
                  {duration(usedThisMonth)} utilizadas{plannedThisMonth > 0 && ` · ${duration(plannedThisMonth)} previstas`}
                </strong>
              </div>
              {usages.length === 0 ? (
                <div className="space-y-2 p-8 text-center text-sm text-muted-foreground">
                  <PawPrint className="mx-auto h-7 w-7 text-teal-600" />
                  <p>Todavía no hay horas registradas en este mes.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {usages.map(usage => (
                    <li key={usage.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-medium">{shortDate(usage.date)}</span>
                          {usage.isPlanned && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">Previsto</span>}
                          {usage.startTime && usage.endTime && <span className="text-sm text-muted-foreground">{usage.startTime.slice(0, 5)}–{usage.endTime.slice(0, 5)}</span>}
                          <strong className="text-teal-700 dark:text-teal-300">{duration(usage.minutes)}</strong>
                        </p>
                        {usage.note && <p className="mt-1 break-words text-sm text-muted-foreground">{usage.note}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {usage.allocations.map(allocation => `${duration(allocation.minutes)} del bono del ${shortDate(allocation.purchasedOn)}`).join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Corregir registro del ${shortDate(usage.date)}`} disabled={!!busy}
                          onClick={() => setAttendance({ usage })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label={`Borrar registro del ${shortDate(usage.date)}`} disabled={!!busy}
                          onClick={() => void removeUsage(usage)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
      {summary && !loading && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />Mes de las estancias
            <Input aria-label="Mes de las estancias" type="month" className="w-auto" min="2000-01" max="9998-12" value={month}
              onChange={event => { if (event.target.value) setMonth(event.target.value); }} />
          </label>
          <ZeusCareSection provider={provider} stays={summary.careStays ?? []} month={month} busy={!!busy}
            onAdd={() => setCare({ stay: null })} onEdit={stay => setCare({ stay })}
            onRemove={stay => void removeCare(stay)} onUnlink={stay => void unlinkCare(stay)} onPay={setPaymentStays}
            onConfirm={expense => { setConfirmError(null); setConfirming(expense); }} />
        </div>
      )}
      {buying && <ZeusPurchaseDialog onClose={() => setBuying(false)} onSaved={data => saved(data, "Bono guardado y vinculado a su gasto.")} />}
      {paymentStays && <ZeusPurchaseDialog stays={paymentStays} onClose={() => setPaymentStays(null)}
        onSaved={data => saved(data, "Pago o previsión guardado. Solo los pagos confirmados figuran como pagados.")} />}
      {care && <ZeusCareDialog provider={provider} stay={care.stay} onClose={() => setCare(null)}
        onSaved={(data, id) => {
          saved(data, "Registro guardado. Elige pago o previsión; si cierras, quedará pendiente sin gasto.");
          if (!care.stay && provider === "alessia") {
            const stay = data.careStays.find(stay => stay.id === id);
            if (stay) setPaymentStays([stay]);
          }
        }} />}
      <ConfirmEntryDialog open={!!confirming} entry={confirmingEntry} busy={!!busy} error={confirmError}
        onOpenChange={open => { if (!open && !busy) setConfirming(null); }} onSubmit={values => void confirmCare(values)} />
      {attendance && <ZeusUsageDialog usage={attendance.usage} onClose={() => setAttendance(null)}
        onSaved={data => saved(data, attendance.usage ? "Registro de horas corregido." : "Horas registradas. El saldo de sus bonos ya está actualizado.")} />}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 px-5 py-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>
    </Card>
  );
}
