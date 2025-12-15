import { useEffect, useState } from "react";

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
  onUpdateClosingBalance?: (id: string, newBalance: number) => Promise<void>; // NEW prop
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
      // success -> onUpdateClosingBalance should reload reconciliations on parent
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
    <aside className="bg-white rounded-lg p-5 shadow-lg border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Conciliación</h3>
          <div className="text-xs text-slate-500">Mes: {month}/{year}</div>
        </div>
        <div>
          <button className="text-sm text-slate-500" onClick={() => onRefresh()} disabled={recLoading}>
            Actualizar
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-slate-500 mb-2">Selecciona reconciliación</label>
        <div className="flex gap-2 items-center">
          <select
            className="flex-1 border px-3 py-2 rounded"
            value={selectedRecon?.id ?? ""}
            onChange={(e) => onSelectRecon(e.target.value)}
          >
            <option value="">{recons.length ? "Selecciona un banco" : "No hay conciliaciones"}</option>
            {recons.map(r => (
              <option key={r.id} value={r.id}>
                {r.label ?? r.bankId} {r.reconciled ? " — Concil." : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Saldo bancario (editable) */}
      <div className="mb-4">
        <label className="block text-xs text-slate-500 mb-1">Saldo bancario (extracto)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            className="flex-1 border px-3 py-2 rounded"
            value={bankBalance}
            onChange={(e) => setBankBalance(e.target.value)}
            disabled={!selectedRecon || recLoading}
          />
          <button
            onClick={handleSaveBalance}
            className="bg-slate-600 text-white px-3 py-2 rounded disabled:opacity-60 text-sm"
            disabled={savingBalance || !selectedRecon || String(selectedRecon?.closingBalance) === bankBalance}
          >
            {savingBalance ? "Guardando..." : "Guardar saldo"}
          </button>
        </div>
        <div className="text-xs text-slate-400 mt-2">Introduce el importe que aparece en tu extracto bancario.</div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 p-4 rounded mb-4 border">
        <div className="text-sm text-slate-600 mb-1">Total del sistema</div>
        <div className="text-xl font-medium">{suggestion ? suggestion.systemTotal.toFixed(2) : "—"}</div>
        <div className="text-sm text-slate-600 mt-3">Saldo final (sistema)</div>
        <div className="text-lg font-semibold">{suggestion ? suggestion.closingBalance.toFixed(2) : (selectedRecon ? selectedRecon.closingBalance.toFixed(2) : "—")}</div>
        <div className="mt-3">
          <div className="text-xs text-slate-600">Diferencia</div>
          <div className={`font-semibold ${suggestion && Math.abs(suggestion.difference) <= 0.01 ? "text-emerald-600" : "text-rose-600"}`}>
            {suggestion ? suggestion.difference.toFixed(2) : "—"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded disabled:opacity-50"
          onClick={() => onFetchSuggestion(selectedRecon?.bankId)}
          disabled={recLoading || !selectedRecon}
        >
          Obtener sugerencias
        </button>
        <button
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded disabled:opacity-50"
          onClick={() => onMarkReconciled()}
          disabled={!canMark || marking}
          title={!canMark ? "La diferencia debe ser 0 para marcar como conciliado" : "Marcar como conciliado"}
        >
          {marking ? "Marcando..." : "Marcar conciliado"}
        </button>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Sugerencias</h4>
        {!suggestion && <div className="text-xs text-slate-500">Pulsa 'Obtener sugerencias' para ver candidatos a revisar</div>}
        {suggestion && Array.isArray(suggestion.details) && suggestion.details.length === 0 && (
          <div className="text-xs text-slate-500">No se encontraron sugerencias concretas</div>
        )}
        {suggestion && Array.isArray(suggestion.details) && suggestion.details.map((d: any, idx: number) => {
          // Normalizamos las distintas variantes de clave que pueda devolver el backend
          const type = d.Type ?? d.type ?? d.Reason ?? d.reason ?? "";
          const desc = d.Description ?? d.description ?? d.Reason ?? d.reason ?? "Transacción candidata";
          const amount = Number(d.Amount ?? d.amount ?? d.Value ?? d.value ?? 0);
          return (
            <div key={idx} className="border rounded p-3 my-2 bg-white flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">{type}</div>
                <div className="text-sm">{desc}</div>
              </div>
              <div className="text-sm font-medium text-slate-700">{amount.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}