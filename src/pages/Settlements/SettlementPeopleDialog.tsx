import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { settlementService, type SettlementPerson } from '../../services/settlementService';

/**
 * Alta y edición de las personas con las que se comparten gastos. El teléfono
 * se queda solo en la base de datos: es lo único que hace falta para abrir el
 * chat de WhatsApp con el mensaje ya escrito. «Cómo sale en el banco» sirve
 * para que, al importar el extracto, sus transferencias se apunten solas en su
 * liquidación.
 */
type PersonDraft = { name: string; phone: string; bank: string };

const fromPerson = (person: SettlementPerson): PersonDraft => ({
  name: person.name,
  phone: person.phoneNumber ?? '',
  bank: person.bankName ?? '',
});

/** The server needs at least 4 letters to recognise the name in the bank text. */
const bankNameTooShort = (bank: string) =>
  bank.trim().length > 0 && bank.replace(/[^A-Za-z0-9À-ÿ]/g, '').length < 4;

export function SettlementPeopleDialog({
  people,
  onClose,
  onSaved,
}: {
  people: SettlementPerson[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, PersonDraft>>(() =>
    Object.fromEntries(people.map((p) => [p.id, fromPerson(p)])),
  );
  const [newPerson, setNewPerson] = useState<PersonDraft>({ name: '', phone: '', bank: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (person: SettlementPerson, change: Partial<PersonDraft>) =>
    setDrafts({ ...drafts, [person.id]: { ...(drafts[person.id] ?? fromPerson(person)), ...change } });

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    if (bankNameTooShort(draft.bank)) {
      setError('El nombre del banco necesita al menos 4 letras.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await settlementService.updatePerson(id, draft.name, draft.phone || null, draft.bank.trim() || null);
      await onSaved();
    } catch {
      setError('No he podido guardar los cambios.');
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!newPerson.name.trim()) {
      setError('Ponle un nombre.');
      return;
    }
    if (bankNameTooShort(newPerson.bank)) {
      setError('El nombre del banco necesita al menos 4 letras.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await settlementService.createPerson(
        newPerson.name.trim(),
        newPerson.phone || null,
        newPerson.bank.trim() || null,
      );
      setNewPerson({ name: '', phone: '', bank: '' });
      await onSaved();
      onClose();
    } catch {
      setError('No he podido añadir a esa persona.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Personas y teléfonos</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {people.length > 0 && (
            <p className="text-xs text-slate-500">
              En «Cómo sale en el banco» copia su nombre tal cual aparece en el extracto. Al
              importar el banco, sus transferencias se apuntan solas en su liquidación.
            </p>
          )}

          {people.map((person) => {
            const draft = drafts[person.id] ?? fromPerson(person);
            return (
              <div key={person.id} className="space-y-2 rounded-lg border border-slate-100 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 text-sm">
                    <span className="mb-1 block text-slate-600">Nombre</span>
                    <input
                      value={draft.name}
                      onChange={(e) => patch(person, { name: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="flex-1 text-sm">
                    <span className="mb-1 block text-slate-600">Teléfono</span>
                    <input
                      value={draft.phone}
                      placeholder="+34 600 00 00 00"
                      onChange={(e) => patch(person, { phone: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 text-sm">
                    <span className="mb-1 block text-slate-600">Cómo sale en el banco</span>
                    <input
                      value={draft.bank}
                      placeholder="Ej.: JENNY MABEL ESPINOZA"
                      onChange={(e) => patch(person, { bank: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => save(person.id)}
                    disabled={busy}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            );
          })}

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Añadir persona
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-slate-600">Nombre</span>
                <input
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-slate-600">Teléfono</span>
                <input
                  value={newPerson.phone}
                  placeholder="+34 600 00 00 00"
                  onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="w-full text-sm">
                <span className="mb-1 block text-slate-600">Cómo sale en el banco (opcional)</span>
                <input
                  value={newPerson.bank}
                  placeholder="Ej.: JENNY MABEL ESPINOZA"
                  onChange={(e) => setNewPerson({ ...newPerson, bank: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={add}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Añadir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettlementPeopleDialog;
