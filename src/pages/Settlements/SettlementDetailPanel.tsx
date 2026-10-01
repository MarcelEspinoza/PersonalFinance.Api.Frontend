import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Plus, RotateCcw, Send, Trash2 } from 'lucide-react';
import {
  settlementService,
  type SettlementCandidate,
  type SettlementDetail,
  type SettlementLineKind,
} from '../../services/settlementService';

const euro = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

/** Las fechas llegan en ISO; en pantalla se leen mejor como 01/09/2026. */
const day = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const kindLabels: Record<SettlementLineKind, string> = {
  Charge: 'Gastos',
  Deduction: 'A restar',
  Payment: 'Ya pagado',
};

export function SettlementDetailPanel({
  detail,
  onChange,
}: {
  detail: SettlementDetail;
  onChange: (next: SettlementDetail) => Promise<void> | void;
}) {
  const [candidates, setCandidates] = useState<SettlementCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const editable = detail.status === 'Draft';

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      setCandidates(await settlementService.getCandidates(detail.id));
    } catch {
      setError('No he podido cargar los movimientos del periodo.');
    } finally {
      setLoadingCandidates(false);
    }
  }, [detail.id]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const run = async (action: () => Promise<SettlementDetail>) => {
    setBusy(true);
    setError(null);
    try {
      await onChange(await action());
      await loadCandidates();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string; detail?: string } } })?.response?.data
          ?.message ??
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'No he podido guardar el cambio.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(detail.message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{detail.title}</h2>
            <p className="text-sm text-slate-500">
              {detail.counterpartyName} · {day(detail.periodStart)} a {day(detail.periodEnd)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              editable ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {editable ? 'Borrador' : 'Enviada'}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Total label="Gastos" value={detail.totals.charges} />
          <Total label="A restar" value={detail.totals.deductions} />
          <Total label="Ya pagado" value={detail.totals.payments} />
          <Total label="Pendiente" value={detail.totals.pending} strong />
        </dl>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Pendiente anterior</span>
            <input
              type="number"
              step="0.01"
              defaultValue={detail.carriedOverAmount}
              disabled={!editable || busy}
              onBlur={(e) => {
                const value = Number(e.target.value || 0);
                if (value !== detail.carriedOverAmount) {
                  void run(() =>
                    settlementService.update(detail.id, { carriedOverAmount: value }),
                  );
                }
              }}
              className="w-36 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="min-w-[16rem] flex-1 text-sm">
            <span className="mb-1 block text-slate-600">Frase final</span>
            <input
              defaultValue={detail.closingNote ?? ''}
              disabled={!editable || busy}
              onBlur={(e) => {
                if (e.target.value !== (detail.closingNote ?? '')) {
                  void run(() =>
                    settlementService.update(detail.id, { closingNote: e.target.value }),
                  );
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Líneas</h3>
        {detail.lines.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay nada. Marca movimientos abajo o añade una línea a mano.
          </p>
        ) : (
          <div className="space-y-3">
            {(['Charge', 'Deduction', 'Payment'] as SettlementLineKind[]).map((kind) => {
              const lines = detail.lines.filter((l) => l.kind === kind);
              if (lines.length === 0) return null;

              return (
                <div key={kind}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {kindLabels[kind]}
                  </p>
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {lines.map((line) => (
                      <li key={line.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                          {line.description}
                          {line.fullAmount != null && (
                            <span className="ml-1 text-xs text-slate-400">
                              ({euro(line.fullAmount)} total)
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{euro(line.amount)}</span>
                        {editable && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => settlementService.deleteLine(detail.id, line.id))}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {editable && <ManualLineForm disabled={busy} onAdd={(payload) => run(() => settlementService.addLine(detail.id, payload))} />}
      </section>

      {editable && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Movimientos del periodo</h3>
            {loadingCandidates && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <CandidateList
            candidates={candidates}
            disabled={busy}
            onAdd={(payload) => run(() => settlementService.addFromEntry(detail.id, payload))}
          />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Mensaje</h3>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {detail.message}
        </pre>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copiado' : 'Copiar'}
          </button>

          {detail.whatsAppUrl ? (
            <a
              href={detail.whatsAppUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (editable) void run(() => settlementService.markSent(detail.id));
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
              Abrir en WhatsApp
            </a>
          ) : (
            <span className="text-sm text-slate-500">
              Ponle el teléfono a {detail.counterpartyName} para poder abrir WhatsApp.
            </span>
          )}

          {!editable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => settlementService.reopen(detail.id))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reabrir
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          WhatsApp se abre con el mensaje ya escrito. El último clic de «Enviar» lo das tú.
        </p>
      </section>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
        {euro(value)}
      </dd>
    </div>
  );
}

function ManualLineForm({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (payload: {
    kind: SettlementLineKind;
    description: string;
    amount: number;
    fullAmount?: number | null;
  }) => void;
}) {
  const [kind, setKind] = useState<SettlementLineKind>('Charge');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [fullAmount, setFullAmount] = useState('');

  const submit = () => {
    const value = Number(amount);
    if (!description.trim() || !Number.isFinite(value) || value <= 0) return;

    onAdd({
      kind,
      description: description.trim(),
      amount: value,
      fullAmount: fullAmount ? Number(fullAmount) : null,
    });
    setDescription('');
    setAmount('');
    setFullAmount('');
  };

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Tipo</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SettlementLineKind)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="Charge">Gasto</option>
          <option value="Deduction">A restar</option>
          <option value="Payment">Ya pagado</option>
        </select>
      </label>
      <label className="min-w-[12rem] flex-1 text-sm">
        <span className="mb-1 block text-slate-600">Concepto</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Importe</span>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Total (opcional)</span>
        <input
          type="number"
          step="0.01"
          value={fullAmount}
          placeholder="si va a medias"
          onChange={(e) => setFullAmount(e.target.value)}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Añadir
      </button>
    </div>
  );
}

function CandidateList({
  candidates,
  disabled,
  onAdd,
}: {
  candidates: SettlementCandidate[];
  disabled: boolean;
  onAdd: (payload: {
    ledgerEntryId: string;
    kind?: SettlementLineKind | null;
    sharePercent?: number | null;
  }) => void;
}) {
  const [filter, setFilter] = useState('');
  const pending = candidates.filter(
    (c) => !c.alreadyAdded && c.description.toLowerCase().includes(filter.toLowerCase()),
  );

  if (candidates.length === 0) {
    return <p className="text-sm text-slate-500">No hay movimientos en estas fechas.</p>;
  }

  return (
    <div className="space-y-3">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar concepto..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      {pending.length === 0 ? (
        <p className="text-sm text-slate-500">Ya has repasado todos los movimientos.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
          {pending.map((c) => (
            <li key={c.ledgerEntryId} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-700">{c.description}</p>
                <p className="text-xs text-slate-400">
                  {day(c.date)} · {c.conceptName}
                </p>
              </div>
              <span
                className={`text-sm font-medium ${
                  c.direction === 'In' ? 'text-emerald-600' : 'text-slate-800'
                }`}
              >
                {euro(c.amount)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd({ ledgerEntryId: c.ledgerEntryId })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Entero
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd({ ledgerEntryId: c.ledgerEntryId, sharePercent: 50 })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                A medias
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SettlementDetailPanel;
