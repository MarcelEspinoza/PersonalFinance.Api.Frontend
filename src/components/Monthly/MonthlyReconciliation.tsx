import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type ReconSummary = {
  id: string;
  bankId: string;
  year: number;
  month: number;
  closingBalance: number;
  reconciled: boolean;
  notes?: string | null;
  createdAt: string;
  bankName?: string;
  bankEntity?: string;
  bankColor?: string;
  label?: string;
};

type SuggestionDto = {
  systemTotal: number;
  closingBalance: number;
  difference: number;
  details?: any[];
};

type Props = {
  year: number;
  month: number;
  recons: ReconSummary[];
  selectedRecon: ReconSummary | null;
  recLoading: boolean;
  recError: string | null;
  suggestion: SuggestionDto | null;
  marking: boolean;
  onRefresh: () => Promise<void>;
  onSelectRecon: (id: string) => void;
  onFetchSuggestion: (bankId?: string) => Promise<void>;
  onMarkReconciled: () => Promise<void>;
  onUpdateClosingBalance?: (id: string, newBalance: number) => Promise<void>;
};

export default function MonthlyReconciliation({
  year,
  month,
  recons,
  selectedRecon,
  recLoading,
  suggestion,
  marking,
  onRefresh,
  onSelectRecon,
  onFetchSuggestion,
  onMarkReconciled,
  onUpdateClosingBalance,
}: Props) {
  const [bankBalance, setBankBalance] = useState<string>("");
  const [savingBalance, setSavingBalance] = useState(false);

  useEffect(() => {
    setBankBalance(selectedRecon ? String(selectedRecon.closingBalance ?? "") : "");
  }, [selectedRecon]);

  const handleSaveBalance = async () => {
    if (!selectedRecon) return;
    const parsed = Number(bankBalance);
    if (isNaN(parsed)) {
      alert("Introduce un número válido para el saldo.");
      return;
    }
    if (!onUpdateClosingBalance) {
      alert("El backend no permite guardar el saldo (endpoint no implementado).");
      return;
    }
    setSavingBalance(true);
    try {
      await onUpdateClosingBalance(selectedRecon.id, parsed);
      alert("Saldo bancario guardado");
    } catch (err) {
      console.error("Error guardando saldo bancario", err);
      alert("No se pudo guardar el saldo bancario");
    } finally {
      setSavingBalance(false);
    }
  };

  const canMark = suggestion && Math.abs(suggestion.difference) <= 0.01 && !!selectedRecon && !selectedRecon.reconciled;

  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b">
        <div>
          <CardTitle className="text-lg">Conciliación</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Mes: {month}/{year}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRefresh()} disabled={recLoading}>
          Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="monthly-reconciliation">Selecciona reconciliación</Label>
          <select
            id="monthly-reconciliation"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={selectedRecon?.id ?? ""}
            onChange={(e) => onSelectRecon(e.target.value)}
          >
            <option value="">{recons.length ? "Selecciona un banco" : "No hay conciliaciones"}</option>
            {recons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label ?? r.bankId} {r.reconciled ? " — Concil." : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly-bank-balance">Saldo bancario (extracto)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="monthly-bank-balance"
              type="number"
              step="0.01"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              disabled={!selectedRecon || recLoading}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveBalance}
              disabled={savingBalance || !selectedRecon || String(selectedRecon?.closingBalance) === bankBalance}
            >
              {savingBalance ? "Guardando..." : "Guardar saldo"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Introduce el importe que aparece en tu extracto bancario.</p>
        </div>

        <div className="space-y-3 rounded-lg border bg-secondary/50 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total del sistema</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{suggestion ? suggestion.systemTotal.toFixed(2) : "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo final (sistema)</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{suggestion ? suggestion.closingBalance.toFixed(2) : (selectedRecon ? selectedRecon.closingBalance.toFixed(2) : "—")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Diferencia</p>
            <p className={`mt-1 font-semibold tabular-nums ${suggestion && Math.abs(suggestion.difference) <= 0.01 ? "text-positive" : "text-negative"}`}>
              {suggestion ? suggestion.difference.toFixed(2) : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={() => onFetchSuggestion(selectedRecon?.bankId)} disabled={recLoading || !selectedRecon}>
            Obtener sugerencias
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onMarkReconciled()}
            disabled={!canMark || marking}
            title={!canMark ? "La diferencia debe ser 0 para marcar como conciliado" : "Marcar como conciliado"}
          >
            {marking ? "Marcando..." : "Marcar conciliado"}
          </Button>
        </div>

        <div>
          <h4 className="text-sm font-medium">Sugerencias</h4>
          {!suggestion && <p className="mt-2 text-xs text-muted-foreground">Pulsa 'Obtener sugerencias' para ver candidatos a revisar</p>}
          {suggestion && Array.isArray(suggestion.details) && suggestion.details.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">No se encontraron sugerencias concretas</p>
          )}
          {suggestion && Array.isArray(suggestion.details) && suggestion.details.map((d: any, idx: number) => {
            const type = d.Type ?? d.type ?? d.Reason ?? d.reason ?? "";
            const desc = d.Description ?? d.description ?? d.Reason ?? d.reason ?? "Transacción candidata";
            const amount = Number(d.Amount ?? d.amount ?? d.Value ?? d.value ?? 0);
            return (
              <div key={idx} className="mt-2 flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{type}</p>
                  <p className="truncate text-sm">{desc}</p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">{amount.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
