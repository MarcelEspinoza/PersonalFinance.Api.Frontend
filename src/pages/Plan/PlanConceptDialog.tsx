import { Loader2 } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  expensePlanningService,
  type ExpensePlanning,
  type ExpensePlanningItem,
  type UpdateExpensePlanning,
} from "../../services/expensePlanningService";
import { ConceptKind, ConceptNature } from "../../types/ledger";
import {
  amountText,
  choiceOf,
  conceptsById,
  monthChoices,
  parseAmount,
  repeatsByItself,
  sameAmount,
  serverMessage,
  thisMonthKey,
  type PlanChoice,
  type PlanConcept,
  type PlanDialogTarget,
} from "./planHelpers";

type Props = {
  target: PlanDialogTarget | null;
  open: boolean;
  /** Changes every time the dialog opens, so the form starts from scratch. */
  formKey: number;
  planning: ExpensePlanning | null;
  /** Concepts with something already in this month or later: they could count twice if they start repeating. */
  amountsAhead: Set<string>;
  onClose: () => void;
  onSaved: (name: string) => void;
};

type Form = {
  conceptId: string;
  choice: PlanChoice;
  amount: string;
  day: string;
  /** "2026-11": month of the next bill when it comes every 2 months. */
  nextDue: string;
  /** "" = no account. */
  account: string;
  limit: string;
};

const COPY: Record<"income" | "expense", Record<PlanChoice, { title: string; example: string }>> = {
  expense: {
    monthly: { title: "Recibo cada mes", example: "Un pago independiente, con importe y día fijos" },
    bimonthly: { title: "Recibo cada 2 meses", example: "Un pago independiente, un mes sí y otro no" },
    variable: { title: "Presupuesto mensual", example: "Un total que incluye tus compras, como las del súper" },
    manual: { title: "No se repite solo", example: "Solo cuenta lo que ya está apuntado" },
  },
  income: {
    monthly: { title: "Cada mes", example: "Como la nómina: mismo importe y mismo día" },
    bimonthly: { title: "Cada 2 meses", example: "Un mes sí y otro no" },
    variable: { title: "Varía cada mes", example: "Pones lo que esperas, más o menos" },
    manual: { title: "No se repite solo", example: "Solo cuenta lo que ya está apuntado" },
  },
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const isRepeating = (choice: PlanChoice) => choice === "monthly" || choice === "bimonthly";

function formFor(item?: ExpensePlanningItem): Form {
  return {
    conceptId: item?.conceptId ?? "",
    choice: item ? choiceOf(item) : "monthly",
    amount: amountText(item?.monthlyAmount),
    day: item?.dayOfMonth ? String(item.dayOfMonth) : "",
    nextDue: item?.nextDueMonth?.slice(0, 7) || thisMonthKey(),
    account: item?.accountId ?? "",
    limit: amountText(item?.monthlyBudget),
  };
}

function isUnchanged(form: Form, item: ExpensePlanningItem): boolean {
  const choice = choiceOf(item);
  if (form.choice !== choice) return false;
  const account = form.account || null;
  if (isRepeating(choice)) {
    const amount = parseAmount(form.amount);
    return (
      amount !== undefined &&
      sameAmount(amount, item.monthlyAmount) &&
      form.day.trim() === String(item.dayOfMonth ?? "") &&
      account === (item.accountId ?? null) &&
      (choice === "monthly" || form.nextDue === item.nextDueMonth?.slice(0, 7))
    );
  }
  if (choice === "variable") {
    const limit = parseAmount(form.limit);
    return limit !== undefined && sameAmount(limit, item.monthlyBudget) && account === (item.accountId ?? null);
  }
  return true;
}

type Built = { error: string } | { payload: UpdateExpensePlanning; onlyLimit: boolean };

function build(form: Form, concept: PlanConcept): Built {
  const isIncome = concept.kind === ConceptKind.Income;
  const accountId = form.account || null;
  if (isRepeating(form.choice)) {
    const amount = parseAmount(form.amount);
    if (amount === undefined) return { error: "Escribe el importe solo con números, por ejemplo 70 o 70,50." };
    if (!amount) return { error: isIncome ? "Pon cuánto cobras (más de 0 €)." : "Pon cuánto pagas (más de 0 €)." };
    const day = Number(form.day.trim());
    if (!form.day.trim() || !Number.isInteger(day) || day < 1 || day > 31) {
      return { error: "Pon el día del mes: un número del 1 al 31." };
    }
    if (!accountId) return { error: isIncome ? "Elige a qué cuenta llega." : "Elige desde qué cuenta se paga." };
    return {
      payload: {
        nature: ConceptNature.Fixed,
        monthlyAmount: amount,
        monthlyBudget: null,
        dayOfMonth: day,
        accountId,
        frequency: form.choice === "bimonthly" ? "bimonthly" : "monthly",
        firstDueMonth: form.choice === "bimonthly" ? `${form.nextDue}-01` : null,
      },
      onlyLimit: false,
    };
  }
  if (form.choice === "variable") {
    const limit = parseAmount(form.limit);
    if (limit === undefined) return { error: "Escribe solo el número, por ejemplo 300 o 300,50." };
    return {
      payload: {
        nature: ConceptNature.Variable,
        monthlyAmount: null,
        monthlyBudget: limit,
        dayOfMonth: null,
        accountId,
        frequency: null,
        firstDueMonth: null,
      },
      // Only the limit of a variable expense changes: its own call touches nothing else.
      onlyLimit: !isIncome && choiceOf(concept.item) === "variable" && accountId === (concept.item.accountId ?? null),
    };
  }
  // No amount, day or account: nothing repeats, each month counts what is already noted.
  return {
    payload: {
      nature: ConceptNature.Fixed,
      monthlyAmount: null,
      monthlyBudget: null,
      dayOfMonth: null,
      accountId: null,
      frequency: null,
      firstDueMonth: null,
    },
    onlyLimit: false,
  };
}

/** Says how a concept repeats (and with what amount, day and account), or adds a new fixed one. */
export function PlanConceptDialog({ target, open, formKey, planning, amountsAhead, onClose, onSaved }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg">
        {target && planning && (
          <PlanConceptForm
            key={formKey}
            target={target}
            planning={planning}
            amountsAhead={amountsAhead}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanConceptForm({
  target,
  planning,
  amountsAhead,
  onClose,
  onSaved,
}: {
  target: PlanDialogTarget;
  planning: ExpensePlanning;
  amountsAhead: Set<string>;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const concepts = useMemo(() => conceptsById(planning), [planning]);
  const [form, setForm] = useState<Form>(() =>
    formFor(target.mode === "edit" ? concepts.get(target.conceptId)?.item : undefined),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionAcknowledged, setConversionAcknowledged] = useState(false);

  const concept = concepts.get(form.conceptId);
  const kind = target.mode === "new" ? target.kind : (concept?.kind ?? ConceptKind.Expense);
  const isIncome = kind === ConceptKind.Income;
  const copy = isIncome ? COPY.income : COPY.expense;
  const choices: PlanChoice[] =
    target.mode === "new" ? ["monthly", "bimonthly"] : ["monthly", "bimonthly", "variable", "manual"];
  const repeats = isRepeating(form.choice);
  const repeatedBefore = concept ? repeatsByItself(concept.item) : false;
  const addsExpensePayment = !isIncome && repeats && !repeatedBefore;
  const convertsBudget = addsExpensePayment && concept?.item.nature === ConceptNature.Variable;
  const submitLabel = isIncome
    ? "Guardar"
    : form.choice === "variable"
      ? "Guardar presupuesto"
      : addsExpensePayment
        ? "Añadir pago fijo"
        : "Guardar cambios";
  const done = isIncome ? "cobrado" : "pagado";
  const candidates =
    target.mode === "new"
      ? planning.groups
          .filter((group) => group.kind === kind)
          .map((group) => ({ name: group.name, items: group.items.filter((item) => !repeatsByItself(item)) }))
          .filter((group) => group.items.length > 0)
      : [];

  const update = (patch: Partial<Form>) => {
    setForm((current) => ({ ...current, ...patch }));
    if (patch.conceptId !== undefined || patch.choice !== undefined) setConversionAcknowledged(false);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!concept) return;
    if (convertsBudget && !conversionAcknowledged) {
      setError("Confirma que quieres convertir el presupuesto en un pago fijo independiente.");
      return;
    }
    const built = build(form, concept);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (built.onlyLimit) {
        await expensePlanningService.setDefaultBudget(concept.item.conceptId, built.payload.monthlyBudget ?? null);
      } else {
        await expensePlanningService.update(concept.item.conceptId, built.payload);
      }
      onSaved(concept.item.name);
    } catch (saveError) {
      setError(serverMessage(saveError) ?? "No se ha podido guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (target.mode === "edit" && !concept) {
    return (
      <DialogHeader>
        <DialogTitle>No se encuentra</DialogTitle>
        <DialogDescription>Ya no existe o se ha desactivado. Cierra esta ventana y vuelve a intentarlo.</DialogDescription>
      </DialogHeader>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <DialogHeader className="pr-6">
        <DialogTitle>
          {target.mode === "edit" ? concept?.item.name : isIncome ? "Nuevo ingreso fijo" : "Añadir pago fijo"}
        </DialogTitle>
        <DialogDescription>
          {target.mode === "edit"
            ? `${isIncome ? "Ingreso" : "Gasto"} de «${concept?.groupName}». Elige cómo se repite: de aquí salen sus importes en cada mes.`
            : isIncome
              ? "Algo que cobras siempre igual: mismo importe y mismo día."
              : "Un pago independiente que se repite. Se suma a lo ya apuntado; no cambia un presupuesto."}
        </DialogDescription>
      </DialogHeader>

      {target.mode === "new" && (
        <Field
          label={isIncome ? "¿Qué ingreso es?" : "¿Qué gasto es?"}
          hint="¿No está en la lista? Puedes crear la categoría al importar el extracto, con el botón «Crear categoría»."
        >
          <select
            value={form.conceptId}
            onChange={(event) => {
              const item = concepts.get(event.target.value)?.item;
              update({ conceptId: event.target.value, account: form.account || item?.accountId || "" });
            }}
            className={selectClass}
          >
            <option value="">Elige uno</option>
            {candidates.map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.items.map((item) => (
                  <option key={item.conceptId} value={item.conceptId}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">¿Cómo se repite?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((choice) => (
            <label
              key={choice}
              className={cn(
                "cursor-pointer rounded-lg border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                form.choice === choice ? "border-primary bg-primary/5" : "hover:bg-accent/60",
              )}
            >
              <input
                type="radio"
                name="plan-choice"
                value={choice}
                checked={form.choice === choice}
                onChange={() => update({ choice })}
                className="sr-only"
              />
              <span className="block text-sm font-medium">{copy[choice].title}</span>
              <span className="block text-xs text-muted-foreground">{copy[choice].example}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {repeats && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={
              form.choice === "bimonthly"
                ? isIncome
                  ? "¿Cuánto cobras cada vez?"
                  : "¿Cuánto es cada recibo?"
                : isIncome
                  ? "¿Cuánto cobras cada mes?"
                  : "¿Cuánto pagas cada mes?"
            }
          >
            <Input
              inputMode="decimal"
              value={form.amount}
              placeholder="0,00"
              onChange={(event) => update({ amount: event.target.value })}
            />
          </Field>
          <Field label="¿Qué día del mes?">
            <Input
              inputMode="numeric"
              value={form.day}
              placeholder="Del 1 al 31"
              onChange={(event) => update({ day: event.target.value })}
            />
          </Field>
          {form.choice === "bimonthly" && (
            <Field
              className="sm:col-span-2"
              label={isIncome ? "¿Cuándo es el próximo cobro?" : "¿Cuándo llega el próximo recibo?"}
            >
              <select
                value={form.nextDue}
                onChange={(event) => update({ nextDue: event.target.value })}
                className={selectClass}
              >
                {monthChoices(form.nextDue).map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field className="sm:col-span-2" label={isIncome ? "¿A qué cuenta llega?" : "¿Desde qué cuenta se paga?"}>
            <select
              value={form.account}
              onChange={(event) => update({ account: event.target.value })}
              className={selectClass}
            >
              <option value="">Elige una cuenta</option>
              {planning.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {form.choice === "variable" && (
        <div className="grid gap-3">
          <Field
            label={isIncome ? "¿Cuánto esperas cobrar al mes, más o menos?" : "Presupuesto total del mes"}
            hint={
              isIncome
                ? "Si lo dejas vacío, solo cuenta lo que ya esté apuntado."
                : "Incluye lo ya gastado. Si lo dejas vacío, no tiene límite."
            }
          >
            <Input
              inputMode="decimal"
              value={form.limit}
              placeholder={isIncome ? "Sin estimación" : "Sin límite"}
              onChange={(event) => update({ limit: event.target.value })}
            />
          </Field>
          <Field label={isIncome ? "¿A qué cuenta suele llegar?" : "¿Desde qué cuenta lo sueles pagar?"}>
            <select
              value={form.account}
              onChange={(event) => update({ account: event.target.value })}
              className={selectClass}
            >
              <option value="">Varias / no lo sé</option>
              {planning.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {form.choice === "manual" && (
        <Note>
          No se crea nada automático: cada mes cuenta solo lo que ya está apuntado en «Mes». Sirve para pagos que
          terminan en una fecha, como el pasanaco.
        </Note>
      )}

      {repeats && (
        <Note>
          Se aplica desde este mes: cambia lo que aún no está {done}. Lo ya {done} no se toca.
        </Note>
      )}
      {repeatedBefore && !repeats && (
        <Note warning>
          Al guardar se quitan {isIncome ? "los cobros automáticos que aún no llegaron" : "los recibos automáticos que aún no se pagaron"},
          desde este mes. Lo ya {done} se queda.
        </Note>
      )}
      {convertsBudget && (
        <div className="space-y-3 rounded-lg bg-warning-soft p-3 text-xs text-warning">
          <p>
            Vas a sustituir el presupuesto por un recibo fijo. Este recibo se sumará a las compras ya registradas;
            no las sustituye. Para cambiar el total del mes, cancela y usa «Cambiar presupuesto».
          </p>
          <label className="flex items-start gap-2 font-medium">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              checked={conversionAcknowledged}
              disabled={saving}
              onChange={(event) => {
                setConversionAcknowledged(event.target.checked);
                setError(null);
              }}
              required
            />
            Quiero convertir el presupuesto en un pago fijo independiente.
          </label>
        </div>
      )}
      {concept && !repeatedBefore && repeats && !convertsBudget && amountsAhead.has(concept.item.conceptId) && (
        <Note warning>
          Ya hay importes de «{concept.item.name}» en este mes o en los siguientes. Si están apuntados en «Mes», podrían
          contarse dos veces: revísalo allí después de guardar.
        </Note>
      )}
      {form.choice === "variable" && !isIncome && (
        <Note>
          El nuevo presupuesto sustituye al anterior e incluye tus compras; no añade un pago.
          Para cambiar el límite solo de un mes, toca su importe en la tabla.
        </Note>
      )}

      {error && (
        <p className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !concept || isUnchanged(form, concept.item) ||
          (convertsBudget && !conversionAcknowledged)}>
          {saving && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">{label}</span>
        {children}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Note({ warning = false, children }: { warning?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-2 text-xs",
        warning ? "bg-warning-soft text-warning" : "bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
