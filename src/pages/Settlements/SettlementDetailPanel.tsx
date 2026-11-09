import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2, Plus, RotateCcw, Send, Trash2 } from 'lucide-react';
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
  PaymentSent: 'Ya le pagué',
};

const statusLabels: Record<SettlementDetail['status'], { text: string; className: string }> = {
  Draft: { text: 'Borrador', className: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
  Sent: { text: 'Enviada', className: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' },
  Closed: { text: 'Pagada', className: 'bg-accent text-foreground' },
};

/** yyyy-MM-dd de hoy + n días, en hora local. */
const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Qué pone la liquidación en la previsión, dicho en cristiano. */
const forecastText = (detail: SettlementDetail) => {
  const forecast = detail.forecast;
  if (!forecast) return null;
  if (forecast.counts && forecast.date) {
    return forecast.direction === 'Out'
      ? `En la previsión: le pagas ${euro(forecast.amount)} a ${detail.counterpartyName} el ${day(forecast.date)}.`
      : `En la previsión: ${detail.counterpartyName} te paga ${euro(forecast.amount)} el ${day(forecast.date)}.`;
  }
  return `No cuenta en la previsión: ${forecast.reason ?? 'no queda nada pendiente'}.`;
};

export const balanceText = (name: string, pending: number, closed: boolean) => {
  const amount = euro(Math.abs(pending));
  if (Math.abs(pending) < 0.005) return closed ? `Saldada con ${name}` : `${name} y tú están a mano`;
  if (closed) return pending > 0 ? `${name} te pagó ${amount}` : `Le pagaste ${amount} a ${name}`;
  return pending > 0 ? `${name} te debe ${amount}` : `Le debes ${amount} a ${name}`;
};

export const balanceTone = (pending: number) =>
  Math.abs(pending) < 0.005 ? 'text-foreground' : pending > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400';

const settingsSummary = (detail: SettlementDetail) => {
  const parts: string[] = [];
  if (detail.linkedLoan) parts.push(`préstamo: ${euro(detail.linkedLoan.outstandingAmount)}`);
  if (Math.abs(detail.carriedOverAmount) >= 0.005) parts.push(`pendiente anterior: ${euro(detail.carriedOverAmount)}`);
  if (detail.closingNote) parts.push('con frase final');
  return parts.length > 0 ? `(${parts.join(' · ')})` : '(sin ajustes)';
};

export function SettlementDetailPanel({
  detail,
  onChange,
}: {
  detail: SettlementDetail;
  onChange: (next: SettlementDetail) => Promise<void> | void;
}) {
  const [candidates, setCandidates] = useState<SettlementCandidate[]>([]);
  const [loanOptions, setLoanOptions] = useState<
    Awaited<ReturnType<typeof settlementService.getLoanOptions>>
  >([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [paymentCandidates, setPaymentCandidates] = useState<SettlementCandidate[] | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [linkLineId, setLinkLineId] = useState('');
  const [lineCandidates, setLineCandidates] = useState<SettlementCandidate[]>([]);
  const [lineEntryId, setLineEntryId] = useState('');
  const [loadingLineEntries, setLoadingLineEntries] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendDate, setSendDate] = useState(() => detail.expectedDate ?? inDays(7));

  const editable = detail.status === 'Draft';
  const status = statusLabels[detail.status] ?? statusLabels.Sent;

  // Keeps the «¿Cuándo esperas el dinero?» box in step with the saved date and the selected settlement.
  useEffect(() => {
    setSendDate(detail.expectedDate ?? inDays(7));
  }, [detail.id, detail.expectedDate]);

  useEffect(() => {
    setPaymentCandidates(null);
    setPaymentId('');
    setLinkLineId('');
    setLineCandidates([]);
    setLineEntryId('');
  }, [detail.id]);

  const loadLineEntries = async (lineId: string) => {
    setLinkLineId(lineId);
    setLineEntryId('');
    setLineCandidates([]);
    setLoadingLineEntries(true);
    setError(null);
    try {
      setLineCandidates(await settlementService.getLineEntryCandidates(detail.id));
    } catch {
      setError('No he podido cargar los movimientos para vincular.');
    } finally {
      setLoadingLineEntries(false);
    }
  };

  const loadPayments = async () => {
    setLoadingPayments(true);
    setError(null);
    try {
      setPaymentCandidates(await settlementService.getPaymentCandidates(detail.id));
    } catch {
      setError('No he podido cargar los cobros y pagos del banco.');
    } finally {
      setLoadingPayments(false);
    }
  };

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

  const loadLoanOptions = useCallback(async () => {
    try {
      setLoanOptions(await settlementService.getLoanOptions());
    } catch {
      setError('No he podido cargar los préstamos recibidos.');
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    void loadLoanOptions();
  }, [loadLoanOptions]);

  const run = async (action: () => Promise<SettlementDetail>) => {
    setBusy(true);
    setError(null);
    try {
      await onChange(await action());
      setPaymentCandidates(null);
      setPaymentId('');
      setLinkLineId('');
      setLineEntryId('');
      await loadCandidates();
      await loadLoanOptions();
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
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {detail.title} · {day(detail.periodStart)} a {day(detail.periodEnd)}
            </p>
            <h2 className={`mt-1 text-2xl font-semibold ${balanceTone(detail.totals.pending)}`}>
              {balanceText(detail.counterpartyName, detail.totals.pending, detail.status === 'Closed')}
            </h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.text}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Total label="Gastos" value={detail.totals.charges} />
          <Total label="A restar" value={detail.totals.deductions} />
          <Total label="Ya pagado" value={detail.totals.payments} />
          {(detail.totals.paymentsSent ?? 0) > 0 && (
            <Total label="Ya le pagué" value={detail.totals.paymentsSent ?? 0} />
          )}
          <Total label={detail.status === 'Closed' ? 'Neto al cerrar' : 'Pendiente'} value={detail.totals.pending} strong />
        </dl>

        <div className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          <p>{forecastText(detail)}</p>
          {detail.status !== 'Closed' && (
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Día en que esperas el dinero</span>
                <input
                  key={detail.expectedDate ?? 'sin-fecha'}
                  type="date"
                  defaultValue={detail.expectedDate ?? ''}
                  disabled={busy}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== (detail.expectedDate ?? '')) {
                      void run(() =>
                        settlementService.update(detail.id, { expectedDate: e.target.value }),
                      );
                    }
                  }}
                  className="rounded-lg border border-input bg-card px-3 py-1.5"
                />
              </label>
              <button
                type="button"
                disabled={busy || loadingPayments}
                onClick={() => void loadPayments()}
                className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingPayments ? 'Cargando movimientos…' : 'Vincular movimiento del banco'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      '¿Ya está pagada (en efectivo, por otra cuenta…)? Saldrá de la previsión. Solo se saldarán los movimientos vinculados: las líneas escritas a mano sin vínculo no cierran sus previstos en «Mes». Revisa «Vincular movimiento» antes de continuar.',
                    )
                  ) {
                    void run(() => settlementService.markPaid(detail.id));
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar como pagada
              </button>
            </div>
          )}
          {paymentCandidates !== null && detail.status !== 'Closed' && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <p>
                Elige la transferencia que salda esta liquidación. No se crea otro movimiento en el banco.
              </p>
              {paymentCandidates.length === 0 ? (
                <p>No hay movimientos disponibles en esta dirección. Primero importa o confirma el movimiento del banco.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label="Transferencia de esta liquidación"
                    value={paymentId}
                    onChange={(event) => setPaymentId(event.target.value)}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-2"
                  >
                    <option value="">Elige un movimiento</option>
                    {paymentCandidates.map((candidate) => (
                      <option key={candidate.ledgerEntryId} value={candidate.ledgerEntryId}>
                        {day(candidate.date)} · {candidate.description} · {euro(candidate.amount)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !paymentId}
                    onClick={() => {
                      const selected = paymentCandidates.find((candidate) => candidate.ledgerEntryId === paymentId);
                      if (selected && window.confirm(
                        `¿Vincular ${euro(selected.amount)} a esta liquidación? Al completar el neto, sus importes incluidos quedarán saldados.`,
                      )) {
                        void run(() => settlementService.linkPayment(detail.id, paymentId));
                      }
                    }}
                    className="rounded-lg bg-teal-600 px-3 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    Vincular
                  </button>
                </div>
              )}
            </div>
          )}
          {detail.status !== 'Closed' && (
            <p className="mt-2 text-xs text-muted-foreground">
              Si la transferencia de {detail.counterpartyName} coincide con el importe exacto, se vincula sola.
            </p>
          )}
        </div>
      </section>

      <details className="group rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
          Ajustes: préstamo, pendiente anterior y frase final
          <span className="ml-2 text-xs font-normal text-muted-foreground">{settingsSummary(detail)}</span>
        </summary>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">
              Pendiente anterior (sin contar préstamo asociado)
            </span>
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
              className="w-48 rounded-lg border border-input px-3 py-2"
            />
          </label>
          <label className="min-w-[16rem] flex-1 text-sm">
            <span className="mb-1 block text-muted-foreground">Frase final</span>
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
              className="w-full rounded-lg border border-input px-3 py-2"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          El saldo del préstamo asociado se calcula solo; usa este campo únicamente para
          otros importes pendientes que no estén registrados en Préstamos.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <label className="min-w-[16rem] flex-1 text-sm">
            <span className="mb-1 block font-medium text-foreground">
              Préstamo recibido de {detail.counterpartyName}
            </span>
            <select
              value={detail.linkedLoanId ?? ''}
              disabled={!editable || busy}
              onChange={(e) =>
                void run(() =>
                  settlementService.linkLoan(detail.id, e.target.value || null),
                )
              }
              className="w-full rounded-lg border border-input px-3 py-2"
            >
              <option value="">Sin préstamo asociado</option>
              {loanOptions.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.name} · pendiente {euro(loan.outstandingAmount)}
                  {loan.status.toLowerCase() === 'cancelled' ? ' · cancelado' : ''}
                </option>
              ))}
            </select>
          </label>
          {detail.linkedLoan && (
            <div className="flex-1 text-sm text-muted-foreground">
              <p>
                Saldo vivo:{' '}
                <strong>{euro(detail.linkedLoan.outstandingAmount)}</strong>
                {detail.linkedLoan.status.toLowerCase() === 'paid' && ' · saldado'}
                {detail.linkedLoan.status.toLowerCase() === 'cancelled' && ' · cancelado'}
              </p>
              {!editable && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Saldo que quedó reflejado en este envío:{' '}
                  {euro(detail.linkedLoan.amountInSettlement)}
                </p>
              )}
              {detail.linkedLoan.outstandingAmount > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          '¿Confirmas que el préstamo ya está completamente pagado? Esto pondrá su saldo pendiente a 0.',
                        )
                      ) {
                        void run(() =>
                          settlementService.closeLinkedLoan(detail.id, 'settled'),
                        );
                      }
                    }}
                    className="rounded-lg border border-input px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 disabled:opacity-50"
                  >
                    Marcar como saldado
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          '¿Confirmas que esta deuda se cancela/perdona? El saldo pendiente del préstamo se pondrá a 0.',
                        )
                      ) {
                        void run(() =>
                          settlementService.closeLinkedLoan(detail.id, 'cancelled'),
                        );
                      }
                    }}
                    className="rounded-lg border border-rose-200 dark:border-rose-900 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
                  >
                    Cancelar deuda
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {detail.linkedLoan && detail.linkedLoan.outstandingAmount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {editable
              ? 'El saldo vivo se resta automáticamente del total. Al registrar un pago en Préstamos, la próxima liquidación recogerá el saldo restante; no vuelvas a añadir ese pago manualmente.'
              : 'El mensaje enviado conserva el saldo capturado entonces. Los cambios actuales del préstamo no modifican ese histórico.'}
          </p>
        )}
      </details>

      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Líneas</h3>
        {detail.lines.some(line => !line.ledgerEntryId) && (
          <p className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            Hay líneas manuales sin movimiento vinculado. Si ya existen en «Mes», usa «Vincular movimiento»:
            no añade otro importe y evita que su previsto siga pendiente al cerrar la liquidación.
          </p>
        )}
        {detail.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay nada. Marca movimientos abajo o añade una línea a mano.
          </p>
        ) : (
          <div className="space-y-3">
            {(['Charge', 'Deduction', 'Payment', 'PaymentSent'] as SettlementLineKind[]).map((kind) => {
              const lines = detail.lines.filter((l) => l.kind === kind);
              if (lines.length === 0) return null;

              return (
                <div key={kind}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {kindLabels[kind]}
                  </p>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {lines.map((line) => (
                      <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={line.description}>
                          {line.description}
                          {line.fullAmount != null && (
                            <span className="ml-1 text-xs text-muted-foreground/70">
                              ({euro(line.fullAmount)} total)
                            </span>
                          )}
                          {line.allocatesPendingEntry && (
                            <span className="ml-2 text-xs text-teal-700 dark:text-teal-300">
                              {detail.status === 'Closed'
                                ? 'Saldado por compensación'
                                : 'Incluido en el neto'}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-foreground">{euro(line.amount)}</span>
                        <button
                          type="button"
                          disabled={busy || loadingLineEntries}
                          onClick={() => {
                            if (line.ledgerEntryId) {
                              if (window.confirm('¿Desvincular el movimiento? No cambia el neto, pero su parte dejará de estar compensada por esta liquidación.')) {
                                void run(() => settlementService.linkLineEntry(detail.id, line.id, null));
                              }
                            } else {
                              void loadLineEntries(line.id);
                            }
                          }}
                          className="rounded border border-input px-2 py-1 text-xs text-foreground hover:bg-muted/50 disabled:opacity-50"
                        >
                          {line.ledgerEntryId ? 'Desvincular movimiento' : 'Vincular movimiento'}
                        </button>
                        {editable && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => settlementService.deleteLine(detail.id, line.id))}
                            className="rounded p-1 text-muted-foreground/70 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {linkLineId === line.id && (
                          <div className="w-full space-y-2 border-t border-border pt-2 text-sm">
                            <p className="text-xs text-muted-foreground">
                              Vincula esta línea sin añadir importes ni cambiar el neto.
                              {detail.status === 'Closed' && ' La parte pendiente quedará saldada por compensación, sin otro movimiento bancario.'}
                            </p>
                            {loadingLineEntries ? (
                              <p>Cargando movimientos…</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <select
                                  aria-label="Movimiento de la línea"
                                  value={lineEntryId}
                                  onChange={(event) => setLineEntryId(event.target.value)}
                                  className="min-w-0 flex-1 rounded border border-input px-2 py-1"
                                >
                                  <option value="">Elige un movimiento</option>
                                  {lineCandidates.filter(candidate =>
                                    candidate.amount >= line.amount &&
                                    (kind === 'Payment' ? candidate.isPaid && candidate.direction === 'In'
                                      : kind === 'PaymentSent' ? candidate.isPaid && candidate.direction === 'Out' : true),
                                  ).map(candidate => (
                                    <option key={candidate.ledgerEntryId} value={candidate.ledgerEntryId}>
                                      {day(candidate.date)} · {candidate.description} · {euro(candidate.amount)} · {candidate.isPaid ? 'Real' : 'Pendiente'}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={busy || !lineEntryId}
                                  onClick={() => {
                                    if (window.confirm(`¿Vincular el movimiento a «${line.description}»? El neto y el estado de la liquidación no cambiarán.`)) {
                                      void run(() => settlementService.linkLineEntry(detail.id, line.id, lineEntryId));
                                    }
                                  }}
                                  className="rounded bg-teal-600 px-3 py-1 text-white disabled:opacity-50"
                                >
                                  Confirmar vínculo
                                </button>
                                <button type="button" onClick={() => setLinkLineId('')} className="px-2 py-1">
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
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
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Movimientos del periodo</h3>
            {loadingCandidates && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/70" />}
          </div>
          <CandidateList
            candidates={candidates}
            disabled={busy}
            onAdd={(payload) => run(() => settlementService.addFromEntry(detail.id, payload))}
          />
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Mensaje</h3>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-foreground">
          {detail.message}
        </pre>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-2 text-sm text-foreground hover:bg-muted/50"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copiado' : 'Copiar'}
          </button>

          {editable && detail.whatsAppUrl && (
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">¿Cuándo esperas el dinero?</span>
              <input
                type="date"
                value={sendDate}
                onChange={(e) => setSendDate(e.target.value)}
                className="rounded-lg border border-input px-3 py-1.5"
              />
            </label>
          )}

          {detail.whatsAppUrl ? (
            <a
              href={detail.whatsAppUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (editable) void run(() => settlementService.markSent(detail.id, sendDate || null));
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
              Abrir en WhatsApp
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">
              Ponle el teléfono a {detail.counterpartyName} para poder abrir WhatsApp.
            </span>
          )}

          {!editable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => settlementService.reopen(detail.id))}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <RotateCcw className="h-4 w-4" />
              Reabrir
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground/70">
          WhatsApp se abre con el mensaje ya escrito. El último clic de «Enviar» lo das tú.
        </p>
      </section>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${strong ? 'font-semibold text-foreground' : 'text-foreground'}`}>
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
    <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Tipo</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SettlementLineKind)}
          className="rounded-lg border border-input px-3 py-2"
        >
          <option value="Charge">Gasto</option>
          <option value="Deduction">A restar</option>
          <option value="Payment">Ya pagado</option>
          <option value="PaymentSent">Ya le pagué</option>
        </select>
      </label>
      <label className="min-w-[12rem] flex-1 text-sm">
        <span className="mb-1 block text-muted-foreground">Concepto</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-input px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Importe</span>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-input px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Total (opcional)</span>
        <input
          type="number"
          step="0.01"
          value={fullAmount}
          placeholder="si va a medias"
          onChange={(e) => setFullAmount(e.target.value)}
          className="w-32 rounded-lg border border-input px-3 py-2"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 dark:bg-slate-600 px-3 py-2 text-sm text-white hover:bg-slate-900 dark:hover:bg-slate-500 disabled:opacity-50"
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
    return <p className="text-sm text-muted-foreground">No hay movimientos en estas fechas.</p>;
  }

  return (
    <div className="space-y-3">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar concepto..."
        className="w-full rounded-lg border border-input px-3 py-2 text-sm"
      />

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ya has repasado todos los movimientos.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {pending.map((c) => (
            <li key={c.ledgerEntryId} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground" title={c.description}>{c.description}</p>
                <p className="text-xs text-muted-foreground/70">
                  {day(c.date)} · {c.conceptName}
                  {c.isPaid === false && ' · Pendiente: la parte incluida se saldará con el neto'}
                </p>
              </div>
              <span
                className={`whitespace-nowrap text-sm font-medium tabular-nums ${
                  c.direction === 'In' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                }`}
              >
                {euro(c.amount)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd({ ledgerEntryId: c.ledgerEntryId })}
                className="rounded-lg border border-input px-2 py-1 text-xs text-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                Entero
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd({ ledgerEntryId: c.ledgerEntryId, sharePercent: 50 })}
                className="rounded-lg border border-input px-2 py-1 text-xs text-foreground hover:bg-muted/50 disabled:opacity-50"
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
