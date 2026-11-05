import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { chatErrorMessage } from "../../services/chatService";
import { LedgerService } from "../../services/ledgerService";
import { ZeusService, type ZeusExpense, type ZeusSummary, type ZeusUsage } from "../../services/zeusService";
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

export function ZeusPassDialog({ onClose, onSaved }: DialogProps) {
  const [id] = useState(() => crypto.randomUUID());
  const [hours, setHours] = useState("60");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [expenses, setExpenses] = useState<ZeusExpense[]>([]);
  const [entryId, setEntryId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [concepts, setConcepts] = useState<ChartConcept[]>([]);
  const [accountId, setAccountId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setEntryId("");
    const load = async () => {
      try {
        if (mode === "existing") {
          const candidates = await ZeusService.expenses(month);
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
  }, [mode, month, reload]);

  const selectedExpense = expenses.find(expense => expense.id === entryId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const purchasedHours = Number(hours);
    if (!Number.isInteger(purchasedHours) || purchasedHours < 1 || purchasedHours > 100000) {
      setError("Indica las horas del bono con un número entero positivo.");
      return;
    }
    if (mode === "existing" && !selectedExpense) {
      setError("Elige el gasto con el que compraste este bono.");
      return;
    }
    setBusy(true);
    try {
      const summary = await ZeusService.buy({
        id, minutes: purchasedHours * 60,
        ...(mode === "existing" ? { ledgerEntryId: entryId } : {
          newExpense: { conceptId, accountId, date, amount: Number(amount) },
        }),
      });
      onSaved(summary);
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo guardar el bono."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Un nuevo bono para Zeus</DialogTitle>
          <DialogDescription>Las horas se acumulan y no caducan. Cada bono queda vinculado a su compra.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {[60, 120].map(value => (
                <Button key={value} type="button" variant={hours === String(value) ? "default" : "outline"}
                  onClick={() => setHours(String(value))} aria-pressed={hours === String(value)}>
                  Bono de {value} h
                </Button>
              ))}
            </div>
            <label className={fieldClass}>
              Horas del bono
              <Input type="number" min="1" max="100000" step="1" value={hours} onChange={event => setHours(event.target.value)} required />
            </label>
            <label className={fieldClass}>
              Compra del bono
              <select aria-label="Compra del bono" className={selectClass} value={mode} onChange={event => {
                setMode(event.target.value === "new" ? "new" : "existing");
                setError(null);
              }}>
                <option value="existing">Vincular un gasto ya pagado</option>
                <option value="new">Registrar una compra nueva y su gasto</option>
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
                    <option value="">Selecciona la compra del bono</option>
                    {expenses.map(expense => <option key={expense.id} value={expense.id}>
                      {shortDate(expense.date)} · {expense.description} · {money(expense.amount)} · {expense.accountName}
                    </option>)}
                  </select>
                </label>
                {expenses.length === 0 && <p className="text-sm text-muted-foreground">No hay gastos disponibles en este mes. Prueba otro mes o registra una compra nueva.</p>}
                {selectedExpense && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p className="font-medium">{money(selectedExpense.amount)} · {selectedExpense.accountName}</p>
                    <p className="mt-1 text-muted-foreground">Comprado el {shortDate(selectedExpense.date)}. No se creará otro gasto.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Solo si esta compra todavía no está registrada: se creará un gasto pagado y descontará su precio de la cuenta.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={fieldClass}>Fecha de compra
                    <Input type="date" min="2000-01-01" max={today()} value={date} onChange={event => setDate(event.target.value)} required />
                  </label>
                  <label className={fieldClass}>Precio (€)
                    <Input type="number" min="0.01" max="999999999" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required />
                  </label>
                </div>
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
                {mode === "new" ? "Comprar bono y crear gasto" : "Guardar bono"}
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
  const [hours, setHours] = useState(String(usage ? Math.floor(usage.minutes / 60) : 0));
  const [minutes, setMinutes] = useState(String(usage ? usage.minutes % 60 : 0));
  const [note, setNote] = useState(usage?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const total = Number(hours) * 60 + Number(minutes);
    if (!Number.isInteger(total) || total < 1 || total > 1440) {
      setError("Indica una duración entre 1 minuto y 24 horas.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onSaved(await ZeusService.saveUsage({ id, date, minutes: total, note }, !!usage));
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
          <DialogDescription>Se usarán primero las horas del bono más antiguo comprado hasta esa fecha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-5">
            <label className={fieldClass}>Día de uso
              <Input type="date" min="2000-01-01" max={today()} value={date} onChange={event => setDate(event.target.value)} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={fieldClass}>Horas
                <Input type="number" min="0" max="24" step="1" value={hours} onChange={event => setHours(event.target.value)} required />
              </label>
              <label className={fieldClass}>Minutos
                <Input type="number" min="0" max="59" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} required />
              </label>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Duraciones rápidas">
              {[2, 4, 8].map(value => <Button key={value} type="button" variant="outline" size="sm"
                onClick={() => { setHours(String(value)); setMinutes("0"); }}>{value} h</Button>)}
            </div>
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
