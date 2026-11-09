import { useCallback, useEffect, useMemo, useState } from 'react';
import { HandCoins, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  settlementService,
  type SettlementDetail,
  type SettlementPerson,
  type SettlementSummary,
} from '../../services/settlementService';
import { SettlementDetailPanel, balanceText, balanceTone } from './SettlementDetailPanel';
import { SettlementPeopleDialog } from './SettlementPeopleDialog';

const firstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

const lastDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export function SettlementsPage() {
  const [people, setPeople] = useState<SettlementPerson[]>([]);
  const [list, setList] = useState<SettlementSummary[]>([]);
  const [selected, setSelected] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'open' | 'paid'>('open');
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    counterpartyId: '',
    periodStart: firstDayOfMonth(),
    periodEnd: lastDayOfMonth(),
  });

  const reload = useCallback(async () => {
    const [nextPeople, nextList] = await Promise.all([
      settlementService.getPeople(),
      settlementService.list(),
    ]);
    setPeople(nextPeople);
    setList(nextList);
    return nextPeople;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const nextPeople = await reload();
        if (!alive) return;
        setForm((prev) => ({
          ...prev,
          counterpartyId: prev.counterpartyId || nextPeople[0]?.id || '',
        }));
      } catch {
        if (alive) setError('No he podido cargar las liquidaciones.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const openSettlement = async (id: string) => {
    setError(null);
    try {
      setSelected(await settlementService.get(id));
    } catch {
      setError('No he podido abrir esa liquidación.');
    }
  };

  const create = async () => {
    if (!form.counterpartyId) {
      setError('Elige primero con quién liquidas.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const detail = await settlementService.create({
        counterpartyId: form.counterpartyId,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
      });
      setSelected(detail);
      setShowCreate(false);
      setTab('open');
      await reload();
    } catch {
      setError('No he podido crear la liquidación.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('¿Borro esta liquidación y todas sus líneas?')) return;
    await settlementService.remove(id);
    if (selected?.id === id) setSelected(null);
    await reload();
  };

  const grouped = useMemo(
    () => ({
      open: [
        ...list.filter((s) => s.status === 'Draft'),
        ...list.filter((s) => s.status === 'Sent'),
      ],
      paid: list.filter((s) => s.status === 'Closed'),
    }),
    [list],
  );

  const firstOpenId = grouped.open[0]?.id;
  const hasSelection = selected !== null;
  useEffect(() => {
    if (loading || hasSelection || !firstOpenId) return;
    let alive = true;
    settlementService
      .get(firstOpenId)
      .then((detail) => {
        if (alive) setSelected((current) => current ?? detail);
      })
      .catch(() => {
        if (alive) setError('No he podido abrir esa liquidación.');
      });
    return () => {
      alive = false;
    };
  }, [loading, hasSelection, firstOpenId]);

  const visible = tab === 'open' ? grouped.open : grouped.paid;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando liquidaciones...
      </div>
    );
  }

  const createForm = (
    <section className="rounded-xl border border-teal-200 dark:border-teal-800 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Nueva liquidación</h2>
        {list.length > 0 && (
          <button type="button" onClick={() => setShowCreate(false)} aria-label="Cerrar" className="rounded p-1 text-muted-foreground/70 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no tienes personas dadas de alta. Añade a mamá y a Vane desde «Personas y teléfonos».
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Con</span>
            <select
              value={form.counterpartyId}
              onChange={(e) => setForm({ ...form, counterpartyId: e.target.value })}
              className="rounded-lg border border-input px-3 py-2"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Desde</span>
            <input
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              className="rounded-lg border border-input px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              className="rounded-lg border border-input px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear
          </button>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-teal-100 dark:bg-teal-900/60 p-2 text-teal-700 dark:text-teal-300">
            <HandCoins className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Liquidaciones</h1>
            <p className="text-sm text-muted-foreground">
              Quién te debe, a quién le debes y el resumen para mandar por WhatsApp.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPeople(true)}
            className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Personas y teléfonos
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Nueva liquidación
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {(showCreate || list.length === 0) && createForm}

      {list.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[300px,1fr]">
          <aside className="self-start rounded-xl border border-border bg-card lg:sticky lg:top-4">
            <div className="flex border-b border-border p-1">
              {([
                ['open', `Pendientes (${grouped.open.length})`],
                ['paid', `Pagadas (${grouped.paid.length})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === key ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300' : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {visible.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {tab === 'open' ? 'No tienes liquidaciones pendientes.' : 'Todavía no hay liquidaciones pagadas.'}
              </p>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                {visible.map((item) => (
                  <SettlementItem
                    key={item.id}
                    item={item}
                    selected={selected?.id === item.id}
                    onOpen={openSettlement}
                    onRemove={remove}
                  />
                ))}
              </ul>
            )}
          </aside>

          <div className="min-w-0">
            {selected ? (
              <SettlementDetailPanel
                detail={selected}
                onChange={async (next) => {
                  setSelected(next);
                  await reload();
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-input p-8 text-center text-sm text-muted-foreground">
                Elige una liquidación de la lista o crea una nueva.
              </div>
            )}
          </div>
        </div>
      )}

      {showPeople && (
        <SettlementPeopleDialog
          people={people}
          onClose={() => setShowPeople(false)}
          onSaved={async () => {
            const nextPeople = await reload();
            setForm((prev) => ({
              ...prev,
              counterpartyId: prev.counterpartyId || nextPeople[0]?.id || '',
            }));
          }}
        />
      )}
    </div>
  );
}

const statusChip: Record<SettlementSummary['status'], { text: string; className: string }> = {
  Draft: { text: 'Borrador', className: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
  Sent: { text: 'Enviada', className: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300' },
  Closed: { text: 'Pagada', className: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' },
};

function SettlementItem({
  item,
  selected,
  onOpen,
  onRemove,
}: {
  item: SettlementSummary;
  selected: boolean;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const chip = statusChip[item.status] ?? statusChip.Sent;
  const closed = item.status === 'Closed';
  return (
    <li className={`group flex items-start gap-2 px-4 py-3 ${selected ? 'bg-teal-50 dark:bg-teal-950/60' : 'hover:bg-muted/50'}`}>
      <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground" title={item.counterpartyName}>
            {item.counterpartyName}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>{chip.text}</span>
        </div>
        <p className={`mt-0.5 text-sm font-medium tabular-nums ${closed ? 'text-muted-foreground' : balanceTone(item.pending)}`}>
          {balanceText(item.counterpartyName, item.pending, closed)}
        </p>
        <p className="truncate text-xs text-muted-foreground/70" title={item.title}>
          {item.title} · {item.lineCount} {item.lineCount === 1 ? 'línea' : 'líneas'}
        </p>
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        title="Borrar"
        aria-label={`Borrar ${item.title}`}
        className="rounded p-1 text-muted-foreground/50 opacity-0 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export default SettlementsPage;