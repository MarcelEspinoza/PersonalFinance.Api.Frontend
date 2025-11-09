import { useEffect, useState } from "react";
import { bankService } from "../../services/bankService";
import { reconciliationService } from "../../services/reconciliationService";
import { Bank, Reconciliation, ReconciliationSuggestion } from "../../types/bank";

export default function MonthlyReconciliation({ year, month }: { year: number; month: number }) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [closing, setClosing] = useState<number | "">("");
  const [suggestion, setSuggestion] = useState<ReconciliationSuggestion | null>(null);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);

  useEffect(() => { loadBanks(); loadReconciliations(); }, [year, month]);

  async function loadBanks() {
    try {
      const { data } = await bankService.getAll();
      setBanks(data);
      if (data.length > 0 && !selectedBank) setSelectedBank(data[0].id);
    } catch (err) { console.error(err); }
  }

  async function loadReconciliations() {
    try {
      const { data } = await reconciliationService.getForMonth(year, month);
      setReconciliations(data);
    } catch (err) { console.error(err); }
  }

  async function computeSuggestion(bankId?: string) {
    try {
      const id = bankId ?? selectedBank;
      if (!id) return;
      const { data } = await reconciliationService.suggest(year, month, id);
      setSuggestion({
        systemTotal: data.systemTotal ?? (data as any).systemTotal ?? 0,
        closingBalance: data.closingBalance ?? 0,
        difference: data.difference ?? 0,
        details: (data as any).details
      } as ReconciliationSuggestion);
    } catch (err) {
      console.error(err);
    }
  }

  async function saveClosing() {
    if (!selectedBank || closing === "") return;
    try {
      await reconciliationService.create({ bankId: selectedBank, year, month, closingBalance: Number(closing), notes: "" });
      await loadReconciliations();
      await computeSuggestion(selectedBank);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar");
    }
  }

  async function markReconciled(id: string) {
    try {
      await reconciliationService.markReconciled(id);
      await loadReconciliations();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Conciliación — {month}/{year}</h3>

      <div className="mb-4">
        <label className="block text-sm text-slate-600 mb-1">Cuenta bancaria</label>
        <select value={selectedBank ?? ""} onChange={e => setSelectedBank(e.target.value)} className="border px-2 py-1 w-full">
          <option value="">-- seleccionar --</option>
          {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-600 mb-1">Saldo final (en cuenta)</label>
        <input type="number" value={closing} onChange={e => setClosing(e.target.value === "" ? "" : Number(e.target.value))} className="border px-2 py-1 w-full" />
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => computeSuggestion()} className="bg-sky-600 text-white px-3 py-1 rounded">Calcular sugerencia</button>
        <button onClick={saveClosing} className="bg-emerald-600 text-white px-3 py-1 rounded">Guardar cierre</button>
      </div>

      {suggestion && (
        <div className="mb-4 border p-3 rounded">
          <div><strong>Total sistema:</strong> {suggestion.systemTotal.toFixed(2)}</div>
          <div><strong>Saldo contable (banco):</strong> {suggestion.closingBalance.toFixed(2)}</div>
          <div><strong>Diferencia:</strong> {suggestion.difference.toFixed(2)}</div>
          <details className="mt-2 text-sm text-slate-600">
            <summary>Ver detalles</summary>
            <pre className="text-xs">{JSON.stringify(suggestion.details, null, 2)}</pre>
          </details>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">Histórico</h4>
        <ul>
          {reconciliations.map(r => (
            <li key={r.id} className="border-b py-2 flex justify-between items-center">
              <div>
                <div>{banks.find(b => b.id === r.bankId)?.name ?? r.bankId} — {r.month}/{r.year}</div>
                <div className="text-sm text-slate-500">Saldo: {r.closingBalance.toFixed(2)} {r.reconciled ? " — Conciliado" : ""}</div>
              </div>
              <div>
                {!r.reconciled && <button onClick={() => markReconciled(r.id)} className="text-emerald-600 mr-2">Marcar conciliado</button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}