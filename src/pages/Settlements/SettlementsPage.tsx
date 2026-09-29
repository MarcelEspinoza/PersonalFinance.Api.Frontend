import { useCallback, useEffect, useMemo, useState } from 'react';
import { HandCoins, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  settlementService,
  type SettlementDetail,
  type SettlementPerson,
  type SettlementSummary,
} from '../../services/settlementService';
import { SettlementDetailPanel } from './SettlementDetailPanel';
import { SettlementPeopleDialog } from './SettlementPeopleDialog';

const euro = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

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
      drafts: list.filter((s) => s.status === 'Draft'),
      sent: list.filter((s) => s.status !== 'Draft'),
    }),
    [list],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando liquidaciones...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-teal-100 p-2 text-teal-700">
            <HandCoins className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Liquidaciones</h1>
            <p className="text-sm text-slate-500">
              Marca qué gastos son de cada persona y mándale el resumen por WhatsApp.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPeople(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Personas y teléfonos
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Nueva liquidación</h2>
        {people.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no tienes personas dadas de alta. Añade a mamá y a Vane desde
            «Personas y teléfonos».
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Con</span>
              <select
                value={form.counterpartyId}
                onChange={(e) => setForm({ ...form, counterpartyId: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Desde</span>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Hasta</span>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2"
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

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <SettlementList
            title="Abiertas"
            items={grouped.drafts}
            selectedId={selected?.id ?? null}
            onOpen={openSettlement}
            onRemove={remove}
          />
          <SettlementList
            title="Enviadas"
            items={grouped.sent}
            selectedId={selected?.id ?? null}
            onOpen={openSettlement}
            onRemove={remove}
          />
        </aside>

        <div>
          {selected ? (
            <SettlementDetailPanel
              detail={selected}
              onChange={async (next) => {
                setSelected(next);
                await reload();
              }}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Elige una liquidación de la lista o crea una nueva.
            </div>
          )}
        </div>
      </div>

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

function SettlementList({
  title,
  items,
  selectedId,
  onOpen,
  onRemove,
}: {
  title: string;
  items: SettlementSummary[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <h3 className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start justify-between gap-2 px-4 py-3 ${
              selectedId === item.id ? 'bg-teal-50' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium text-slate-800">{item.counterpartyName}</p>
              <p className="truncate text-xs text-slate-500">{item.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {euro(item.pending)}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {item.lineCount} {item.lineCount === 1 ? 'línea' : 'líneas'}
                </span>
              </p>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              title="Borrar"
              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SettlementsPage;
