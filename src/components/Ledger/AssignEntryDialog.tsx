import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  settlementService,
  type SettlementLineKind,
  type SettlementPerson,
} from '../../services/settlementService';

/**
 * Manda un movimiento del libro a la liquidación abierta de una persona. Si no
 * hay ninguna abierta, el backend crea la del mes en curso.
 */
export function AssignEntryDialog({
  entryId,
  entryDescription,
  entryAmount,
  onClose,
}: {
  entryId: string;
  entryDescription: string;
  entryAmount: number;
  onClose: () => void;
}) {
  const [people, setPeople] = useState<SettlementPerson[]>([]);
  const [personId, setPersonId] = useState('');
  const [split, setSplit] = useState<'full' | 'half' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState('');
  const [kind, setKind] = useState<SettlementLineKind>('Charge');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await settlementService.getPeople();
        if (!alive) return;
        setPeople(list);
        setPersonId(list[0]?.id ?? '');
      } catch {
        if (alive) setError('No he podido cargar las personas.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    if (!personId) {
      setError('Elige a quién se lo imputas.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const detail = await settlementService.assignEntry({
        counterpartyId: personId,
        ledgerEntryId: entryId,
        kind,
        sharePercent: split === 'half' ? 50 : null,
        amount: split === 'custom' && customAmount ? Number(customAmount) : null,
      });
      setDone(`Añadido a «${detail.title}». Pendiente: ${detail.totals.pending.toFixed(2)} €`);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? 'No he podido imputar el movimiento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Imputar a una liquidación</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-600">
            {entryDescription} · <strong>{entryAmount.toFixed(2)} €</strong>
          </p>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {done ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {done}
            </p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Persona</span>
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {people.length === 0 && <option value="">No hay personas dadas de alta</option>}
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Concepto</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as SettlementLineKind)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Charge">Se lo cobro</option>
                  <option value="Deduction">Me lo descuenta</option>
                  <option value="Payment">Ya me lo pagó</option>
                </select>
              </label>

              <div className="text-sm">
                <span className="mb-1 block text-slate-600">Reparto</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['full', 'Entero'],
                      ['half', 'A medias'],
                      ['custom', 'Otro importe'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSplit(value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        split === value
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-slate-300 text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {split === 'custom' && (
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Importe que le toca</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              )}
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && (
            <button
              type="button"
              onClick={submit}
              disabled={busy || people.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Imputar
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default AssignEntryDialog;
