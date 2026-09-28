import { Check, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  expensePlanningService,
  type ExpensePlanning,
  type ExpensePlanningItem,
} from "../../services/expensePlanningService";
import { ConceptKind, ConceptNature } from "../../types/ledger";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type EditableItem = ExpensePlanningItem & {
  monthlyAmountText: string;
  monthlyBudgetText: string;
  dayOfMonthText: string;
  saving: boolean;
  saved: boolean;
};

const editable = (item: ExpensePlanningItem): EditableItem => ({
  ...item,
  monthlyAmountText: item.monthlyAmount == null ? "" : String(item.monthlyAmount),
  monthlyBudgetText: item.monthlyBudget == null ? "" : String(item.monthlyBudget),
  dayOfMonthText: item.dayOfMonth == null ? "1" : String(item.dayOfMonth),
  saving: false,
  saved: false,
});

const numberOrNull = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ExpensePlanningManager() {
  const [activeKind, setActiveKind] = useState<ConceptKind>(ConceptKind.Expense);
  const [planning, setPlanning] = useState<ExpensePlanning | null>(null);
  const [items, setItems] = useState<Record<string, EditableItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void expensePlanningService.get()
      .then((result) => {
        setPlanning(result);
        setItems(Object.fromEntries(
          result.groups.flatMap((group) => group.items).map((item) => [item.conceptId, editable(item)]),
        ));
      })
      .catch(() => setError("No se ha podido cargar la planificación."))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => Object.values(items)
    .filter((item) => planning?.groups.some((group) =>
      group.kind === activeKind && group.items.some((candidate) => candidate.conceptId === item.conceptId)))
    .reduce(
    (result, item) => {
      if (item.nature === ConceptNature.Fixed) {
        result.fixed += numberOrNull(item.monthlyAmountText) ?? 0;
      } else {
        result.variable += numberOrNull(item.monthlyBudgetText) ?? 0;
      }
      return result;
    },
    { fixed: 0, variable: 0 },
  ), [activeKind, items, planning]);

  const updateItem = (conceptId: string, patch: Partial<EditableItem>) => {
    setItems((current) => ({
      ...current,
      [conceptId]: { ...current[conceptId], ...patch, saved: false },
    }));
  };

  const save = async (conceptId: string) => {
    const item = items[conceptId];
    const monthlyAmount = numberOrNull(item.monthlyAmountText);
    const monthlyBudget = numberOrNull(item.monthlyBudgetText);
    const dayOfMonth = numberOrNull(item.dayOfMonthText);

    if (item.nature === ConceptNature.Fixed && (!monthlyAmount || !dayOfMonth || !item.accountId)) {
      setError("Los movimientos fijos necesitan importe mensual, día y cuenta.");
      return;
    }
    if (item.nature === ConceptNature.Variable && monthlyBudget != null && monthlyBudget < 0) {
      setError("El límite mensual no puede ser negativo.");
      return;
    }

    updateItem(conceptId, { saving: true });
    setError(null);
    try {
      const saved = await expensePlanningService.update(conceptId, {
        nature: item.nature,
        monthlyAmount: item.nature === ConceptNature.Fixed ? monthlyAmount : null,
        monthlyBudget: item.nature === ConceptNature.Variable ? monthlyBudget : null,
        dayOfMonth: item.nature === ConceptNature.Fixed ? dayOfMonth : null,
        accountId: item.accountId,
      });
      setItems((current) => ({
        ...current,
        [conceptId]: { ...editable(saved), saved: true },
      }));
    } catch {
      setError(`No se ha podido guardar "${item.name}".`);
      updateItem(conceptId, { saving: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando planificación…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/35 p-1.5">
        <button
          type="button"
          onClick={() => setActiveKind(ConceptKind.Income)}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
            activeKind === ConceptKind.Income ? "bg-card text-positive shadow-sm" : "text-muted-foreground"
          }`}
        >
          Ingresos
        </button>
        <button
          type="button"
          onClick={() => setActiveKind(ConceptKind.Expense)}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
            activeKind === ConceptKind.Expense ? "bg-card text-negative shadow-sm" : "text-muted-foreground"
          }`}
        >
          Gastos
        </button>
      </div>

      <div className="rounded-xl border bg-muted/35 p-4">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">
              {activeKind === ConceptKind.Income ? "Planifica lo que esperas ingresar" : "Tú decides qué entra en la previsión"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Los fijos se repiten cada mes con una cuenta y fecha.
              En los variables, indica {activeKind === ConceptKind.Income
                ? "una estimación prudente"
                : "el máximo que quieres gastar y la cuenta desde la que saldrá"}.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Total label={activeKind === ConceptKind.Income ? "Ingresos fijos previstos" : "Gastos fijos previstos"} value={totals.fixed} />
          <Total label={activeKind === ConceptKind.Income ? "Estimaciones variables" : "Límites variables"} value={totals.variable} />
          <Total label="Plan mensual total" value={totals.fixed + totals.variable} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-negative/25 bg-negative-soft p-3 text-sm text-negative">
          {error}
        </div>
      )}

      {planning?.groups.filter((group) => group.kind === activeKind).map((group) => (
        <section key={group.name} className="space-y-3">
          <h3 className="font-semibold">{group.name}</h3>
          <div className="divide-y rounded-xl border">
            {group.items.map((original) => {
              const item = items[original.conceptId];
              if (!item) return null;
              const fixed = item.nature === ConceptNature.Fixed;
              return (
                <div key={item.conceptId} className="grid gap-3 p-4 lg:grid-cols-[minmax(180px,1fr)_140px_minmax(130px,0.7fr)_100px_minmax(150px,0.8fr)_auto] lg:items-end">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fixed
                        ? "Se repetirá automáticamente cada mes."
                        : activeKind === ConceptKind.Income
                          ? "Estimación mensual opcional para la proyección."
                          : "La previsión reservará como máximo este límite."}
                    </div>
                  </div>
                  <Field label="Tipo">
                    <select
                      value={item.nature}
                      onChange={(event) => updateItem(item.conceptId, {
                        nature: event.target.value as ConceptNature,
                      })}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value={ConceptNature.Fixed}>Fijo</option>
                      <option value={ConceptNature.Variable}>Variable</option>
                    </select>
                  </Field>
                  <Field label={fixed ? "Importe mensual" : activeKind === ConceptKind.Income ? "Estimación mensual" : "Límite mensual"}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fixed ? item.monthlyAmountText : item.monthlyBudgetText}
                      onChange={(event) => updateItem(item.conceptId, fixed
                        ? { monthlyAmountText: event.target.value }
                        : { monthlyBudgetText: event.target.value })}
                      placeholder="0,00"
                    />
                  </Field>
                  <Field label="Día">
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      disabled={!fixed}
                      value={item.dayOfMonthText}
                      onChange={(event) => updateItem(item.conceptId, { dayOfMonthText: event.target.value })}
                    />
                  </Field>
                  <Field label="Cuenta">
                    <select
                      value={item.accountId ?? ""}
                      onChange={(event) => updateItem(item.conceptId, { accountId: event.target.value || null })}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">{fixed ? "Selecciona una cuenta" : "Sin cuenta (ajuste global)"}</option>
                      {planning.accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Button
                    size="sm"
                    onClick={() => void save(item.conceptId)}
                    disabled={item.saving}
                    className="min-w-24"
                  >
                    {item.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : item.saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {item.saved ? "Guardado" : "Guardar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-background px-3 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">
        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)}
      </div>
    </div>
  );
}
