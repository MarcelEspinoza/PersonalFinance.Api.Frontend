import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { chatErrorMessage } from "../../services/chatService";
import { LedgerService } from "../../services/ledgerService";
import {
  ZeusService, careProviderName, careStayDescription, duration, isCareForecast, timeRangeMinutes, zeusDaycarePackages,
  type ZeusCareStay, type ZeusExpense, type ZeusSummary, type ZeusUsage,
} from "../../services/zeusService";
import { ConceptKind, type Account, type ChartConcept } from "../../types/ledger";
import { money, shortDate, today } from "../../utils/civilDate";

const fieldClass = "flex flex-col gap-1.5 text-sm font-medium";
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm font-normal";

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-negative/20 bg-negative-soft p-3 text-sm text-negative">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  ) : null;
}

type DialogProps = {
  onClose: () => void;
  onSaved: (summary: ZeusSummary) => void;
};

export function ZeusPurchaseDialog({ onClose, onSaved, stays }: DialogProps & { stays?: ZeusCareStay[] }) {
  const [id] = useState(() => crypto.randomUUID());
  const [packageId, setPackageId] = useState("6-10");
  const [hours, setHours] = useState("60");
  const [selectedStayIds, setSelectedStayIds] = useState(() => stays?.map(stay => stay.id) ?? []);
  const [mode, setMode] = useState<"existing" | "new" | "forecast">(
    stays?.length && stays.every(stay => stay.date > today() && !stay.expense) ? "forecast" : "existing");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [expenses, setExpenses] = useState<ZeusExpense[]>([]);
  const [entryId, setEntryId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [concepts, setConcepts] = useState<ChartConcept[]>([]);
  const [accountId, setAccountId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [date, setDate] = useState(() => stays?.length === 1 && stays[0].date > today() ? stays[0].date : today());
  const [amount, setAmount] = useState(() => String(stays ? Math.round(stays.reduce((sum, stay) => sum + stay.amount, 0) * 100) / 100 : 100));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const provider = stays?.[0]?.provider;
  const selectedStays = stays?.filter(stay => selectedStayIds.includes(stay.id)) ?? [];
  const careTotal = Math.round(selectedStays.reduce((sum, stay) => sum + stay.amount, 0) * 100) / 100;
  const selectedPackage = zeusDaycarePackages.find(item => item.id === packageId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setEntryId("");
    const load = async () => {
      try {
        if (mode === "existing") {
          const candidates = await ZeusService.expenses(month, provider);
          if (active) setExpenses(candidates);
        } else {
          const [allAccounts, chart] = await Promise.all([
            LedgerService.getAccounts(), LedgerService.getChartOfAccounts(),
          ]);
          if (!active) return;
          setAccounts(allAccounts.filter(account => account.isActive));
          const expenseConcepts = chart.groups.filter(group => group.isActive && group.kind === ConceptKind.Expense)
            .flatMap(group => group.concepts.filter(concept => concept.isActive));
          setConcepts(expenseConcepts);
          setConceptId(expenseConcepts.find(concept => /mascota/i.test(concept.name))?.id ?? "");
        }
      } catch (err) {
        if (active) setLoadError(chatErrorMessage(err, "No se pudieron cargar los gastos o las cuentas."));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [mode, month, reload, provider]);

  const selectedExpense = expenses.find(expense => expense.id === entryId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const purchasedHours = Number(hours);
    if (!stays && (!Number.isInteger(purchasedHours) || purchasedHours < 1 || purchasedHours > 100000)) {
      setError("Indica las horas del bono con un número entero positivo.");
      return;
    }
    if (mode === "existing" && !selectedExpense) {
      setError("Elige el gasto pagado que quieres vincular.");
      return;
    }
    if (stays && (selectedStays.length === 0 || (mode === "existing" && selectedExpense
      ? Math.round((selectedExpense.amount - (selectedExpense.allocatedAmount ?? 0)) * 100) / 100 < careTotal
      : mode !== "forecast" && Number(amount) < careTotal))) {
      setError("Selecciona estancias cuyo total esté cubierto por el importe disponible del pago.");
      return;
    }
    setBusy(true);
    try {
      const purchase = { conceptId, accountId, date, amount: Number(amount) };
      const payment = mode === "existing" ? { ledgerEntryId: entryId }
        : mode === "forecast" ? { newForecast: { ...purchase, amount: careTotal } } : { newExpense: purchase };
      const summary = stays
        ? await ZeusService.payCare({ stayIds: selectedStayIds, ...payment })
        : await ZeusService.buy({ id, minutes: purchasedHours * 60, ...payment });
      onSaved(summary);
    } catch (err) {
      setError(chatErrorMessage(err, stays ? "No se pudo guardar el pago o la previsión." : "No se pudo guardar el bono."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{provider ? `Pago o previsión · ${careProviderName(provider)}` : "Un nuevo bono para Zeus"}</DialogTitle>
          <DialogDescription>{stays
            ? "Elige un pago ya hecho o prevé lo que pagarás el día acordado. Una previsión no significa que ya esté pagado."
            : "Bonos de la guardería. Las horas se acumulan y no caducan; se descuentan solo las horas reales."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5">
            {stays ? (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Cuidados o cargos que cubre</p>
                {stays.map(stay => (
                  <label key={stay.id} className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1" checked={selectedStayIds.includes(stay.id)} onChange={event => {
                      const ids = event.target.checked ? [...selectedStayIds, stay.id] : selectedStayIds.filter(id => id !== stay.id);
                      setSelectedStayIds(ids);
                      setAmount(String(Math.round(stays.filter(stay => ids.includes(stay.id)).reduce((sum, stay) => sum + stay.amount, 0) * 100) / 100));
                    }} />
                    <span>{shortDate(stay.date)} {stay.date.slice(0, 4)} · {careStayDescription(stay)} · <strong>{money(stay.amount)}</strong>{isCareForecast(stay) && <span className="block text-xs text-muted-foreground">Ya tiene previsión: se ajustará o descartará al sustituirla.</span>}</span>
                  </label>
                ))}
                <p className="border-t pt-3 text-sm">Total seleccionado: <strong>{money(careTotal)}</strong></p>
              </div>
            ) : (
              <>
                <label className={fieldClass}>Bono de la guardería
                  <select aria-label="Bono de la guardería" className={selectClass} value={packageId} onChange={event => {
                    setPackageId(event.target.value);
                    const item = zeusDaycarePackages.find(item => item.id === event.target.value);
                    if (item) { setHours(String(item.days * item.dailyHours)); setAmount(String(item.price)); }
                  }}>
                    {[6, 12].map(dailyHours => <optgroup key={dailyHours} label={`${dailyHours} horas al día`}>
                      {zeusDaycarePackages.filter(item => item.dailyHours === dailyHours).map(item => (
                        <option key={item.id} value={item.id}>{item.days} {item.days === 1 ? "día" : "días"} · {item.days * item.dailyHours} h · {money(item.price)}</option>
                      ))}
                    </optgroup>)}
                    <option value="custom">Otro bono · indicar horas y precio</option>
                  </select>
                </label>
                {selectedPackage && <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">
                  {selectedPackage.days} {selectedPackage.days === 1 ? "día" : "días"} × {selectedPackage.dailyHours} h = <strong>{hours} h</strong> · <strong>{money(selectedPackage.price)}</strong>. Precio del folleto, sin descuento.
                </p>}
                <label className={fieldClass}>Horas del bono
                  <Input type="number" min="1" max="100000" step="1" value={hours} readOnly={packageId !== "custom"}
                    onChange={event => setHours(event.target.value)} required />
                </label>
              </>
            )}
            <label className={fieldClass}>
              {stays ? "Pago o previsión" : "Compra del bono"}
              <select aria-label={stays ? "Pago o previsión" : "Compra del bono"} className={selectClass} value={mode} onChange={event => {
                setMode(event.target.value === "new" ? "new" : event.target.value === "forecast" ? "forecast" : "existing");
                setError(null);
                setDate(event.target.value === "forecast" && selectedStays.length
                  ? [...selectedStays].sort((a, b) => a.date.localeCompare(b.date))[0].date : today());
              }}>
                <option value="existing">Vincular un gasto ya pagado</option>
                <option value="new">{stays ? "Registrar un pago nuevo y su gasto" : "Registrar una compra nueva y su gasto"}</option>
                {stays && <option value="forecast">Crear previsión para el día acordado</option>}
              </select>
            </label>
            {mode === "existing" && (
              <label className={fieldClass}>
                Mes del gasto
                <Input type="month" min="2000-01" max={today().slice(0, 7)} value={month}
                  onChange={event => { if (event.target.value) setMonth(event.target.value); }} required />
              </label>
            )}
            {loading ? (
              <p role="status" className="flex gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando compras…</p>
            ) : loadError ? (
              <div className="space-y-2"><FormError message={loadError} /><Button type="button" variant="outline" onClick={() => setReload(value => value + 1)}>Reintentar</Button></div>
            ) : mode === "existing" ? (
              <div className="space-y-3">
                <label className={fieldClass}>
                  Gasto pagado
                  <select aria-label="Gasto pagado" className={selectClass} value={entryId} onChange={event => setEntryId(event.target.value)} required>
                    <option value="">Selecciona el gasto pagado</option>
                    {expenses.map(expense => <option key={expense.id} value={expense.id}>
                      {shortDate(expense.date)} · {expense.description} · {money(expense.amount - (expense.allocatedAmount ?? 0))} disponibles · {expense.accountName}
                    </option>)}
                  </select>
                </label>
                {expenses.length === 0 && <p className="text-sm text-muted-foreground">No hay gastos disponibles en este mes. Prueba otro mes o registra una compra nueva.</p>}
                {selectedExpense && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p className="font-medium">{money(selectedExpense.amount)} · {selectedExpense.accountName}</p>
                    <p className="mt-1 text-muted-foreground">Pagado el {shortDate(selectedExpense.date)}. No se creará otro gasto.</p>
                    {stays && <p className="mt-1 text-muted-foreground">
                      Ya asignados: {money(selectedExpense.allocatedAmount ?? 0)}. Disponible: {money(selectedExpense.amount - (selectedExpense.allocatedAmount ?? 0))}.
                      {Math.round((selectedExpense.amount - (selectedExpense.allocatedAmount ?? 0)) * 100) >= Math.round(careTotal * 100)
                        && <> Sin asignar después: {money(selectedExpense.amount - (selectedExpense.allocatedAmount ?? 0) - careTotal)}.</>}
                    </p>}
                    {!stays && selectedPackage && selectedExpense.amount !== selectedPackage.price
                      && <p className="mt-2 text-muted-foreground">Difiere de los {money(selectedPackage.price)} del folleto. Se conservará el importe real de este gasto.</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{mode === "forecast"
                  ? "Se creará un gasto previsto en Mes para esa fecha. Contará en la previsión de dinero disponible, pero no restará del saldo real ni figurará pagado."
                  : "Solo si este pago todavía no está registrado: se creará un gasto pagado y descontará su importe de la cuenta."}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={fieldClass}>{mode === "forecast" ? "Día previsto del pago" : stays ? "Fecha del pago" : "Fecha de compra"}
                    <Input type="date" min="2000-01-01" max={mode === "forecast" ? "9998-12-31" : today()} value={date} onChange={event => setDate(event.target.value)} required />
                  </label>
                  <label className={fieldClass}>{mode === "forecast" ? "Importe previsto (€)" : stays ? "Importe del pago (€)" : "Precio (€)"}
                    <Input type="number" min="0.01" max="999999999" step="0.01" readOnly={mode === "forecast"}
                      value={mode === "forecast" ? careTotal : amount} onChange={event => setAmount(event.target.value)} required />
                  </label>
                </div>
                {stays && mode !== "forecast" && Number(amount) >= careTotal && <p className="text-sm text-muted-foreground">
                  Se asignarán {money(careTotal)} a las estancias seleccionadas y quedarán {money(Number(amount) - careTotal)} sin asignar.
                </p>}
                <label className={fieldClass}>Cuenta del pago
                  <select aria-label="Cuenta del pago" className={selectClass} value={accountId} onChange={event => setAccountId(event.target.value)} required>
                    <option value="">Selecciona una cuenta</option>
                    {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
                <label className={fieldClass}>Concepto del gasto
                  <select aria-label="Concepto del gasto" className={selectClass} value={conceptId} onChange={event => setConceptId(event.target.value)} required>
                    <option value="">Selecciona un concepto</option>
                    {concepts.map(concept => <option key={concept.id} value={concept.id}>{concept.name}</option>)}
                  </select>
                </label>
              </div>
            )}
            <FormError message={error} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={loading || !!loadError}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {stays ? mode === "forecast" ? "Crear previsión sin marcar pagado" : mode === "new" ? "Registrar pago y crear gasto" : "Vincular pago"
                  : mode === "new" ? "Comprar bono y crear gasto" : "Guardar bono"}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ZeusUsageDialog({ usage, onClose, onSaved }: DialogProps & { usage: ZeusUsage | null }) {
  const [id] = useState(() => usage?.id ?? crypto.randomUUID());
  const [date, setDate] = useState(usage?.date ?? today());
  const [startTime, setStartTime] = useState(usage?.startTime?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(usage?.endTime?.slice(0, 5) ?? "");
  const [note, setNote] = useState(usage?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = timeRangeMinutes(startTime, endTime);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(total) || total < 1 || total >= 1440) {
      setError("La salida debe ser posterior a la entrada en el mismo día.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onSaved(await ZeusService.saveUsage({
        id, date, startTime: `${startTime}:00`, endTime: `${endTime}:00`, note,
      }, !!usage));
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudieron guardar las horas."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{usage ? "Corregir horas de Zeus" : "Registrar un día de Zeus"}</DialogTitle>
          <DialogDescription>Elige el día y de qué hora a qué hora estuvo. La duración se descuenta automáticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-5">
            <label className={fieldClass}>Día de uso
              <Input type="date" min="2000-01-01" max="9998-12-31" value={date} onChange={event => setDate(event.target.value)} required />
            </label>
            {date > today() && <p className="text-sm text-muted-foreground">Es un día futuro: quedará como previsto. Las horas se apartan ya de sus bonos, pero no cuentan como usadas hasta que llegue ese día.</p>}
            <div className="grid grid-cols-2 gap-3">
              <label className={fieldClass}>Hora de entrada
                <Input type="time" step="60" value={startTime} onChange={event => setStartTime(event.target.value)} required />
              </label>
              <label className={fieldClass}>Hora de salida
                <Input type="time" step="60" value={endTime} onChange={event => setEndTime(event.target.value)} required />
              </label>
            </div>
            <div aria-live="polite" className="rounded-lg bg-teal-50 p-4 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">
              {total > 0
                ? <>Se descontarán <strong>{duration(total)}</strong> de sus bonos.</>
                : startTime && endTime ? "La salida debe ser posterior a la entrada en el mismo día." : "Indica el horario para ver cuántas horas se descontarán."}
            </div>
            {usage && !usage.startTime && <p className="text-sm text-muted-foreground">Este registro tenía {duration(usage.minutes)} sin horario. Al guardar se actualizará con las horas que indiques.</p>}
            <label className={fieldClass}>Nota (opcional)
              <Input maxLength={300} value={note} onChange={event => setNote(event.target.value)} placeholder="Por ejemplo: mañana en la guardería" />
            </label>
            <FormError message={error} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{usage ? "Guardar cambios" : "Guardar horas"}</Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
