import { useState } from "react";
import { ledgerErrorMessage } from "../../services/ledgerService";
import { normalizeSearchText } from "../../lib/utils";
import type { ImportPersonOption } from "../../types/ledger";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ImportPersonPickerProps {
  id: string;
  people: ImportPersonOption[];
  value: string;
  disabled: boolean;
  excludedIds?: string[];
  onChange: (id: string) => void;
  onCreatePerson: (name: string) => Promise<ImportPersonOption>;
  onCreatingChange: (creating: boolean) => void;
}

export function ImportPersonPicker({
  id, people, value, disabled, excludedIds = [], onChange, onCreatePerson, onCreatingChange,
}: ImportPersonPickerProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || disabled || creating) return;
    setError(null);
    const existing = people.find(person => normalizeSearchText(person.name) === normalizeSearchText(trimmed));
    if (existing && excludedIds.includes(existing.id)) {
      setError("Esta persona ya tiene una parte en el reparto.");
      return;
    }
    if (existing) {
      onChange(existing.id);
      setName("");
      return;
    }
    setCreating(true);
    onCreatingChange(true);
    try {
      const person = await onCreatePerson(trimmed);
      onChange(person.id);
      setName("");
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido crear la persona o el comercio."));
    } finally {
      setCreating(false);
      onCreatingChange(false);
    }
  };
  return (
    <div className="min-w-0 space-y-2">
      <select id={id} value={value} disabled={disabled || creating}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal"
        onChange={event => { onChange(event.target.value); setError(null); }}>
        <option value="">Elige una persona o comercio…</option>
        {people.map(person => (
          <option key={person.id} value={person.id} disabled={excludedIds.includes(person.id)}>{person.name}</option>
        ))}
        <option value="new">Otra persona o comercio…</option>
      </select>
      {value === "new" && (
        <div className="space-y-2 rounded-md border p-3">
          <label className="block space-y-1 text-xs font-medium" htmlFor={`${id}-name`}>
            Nombre de la persona o comercio
          </label>
          <Input id={`${id}-name`} value={name} disabled={disabled || creating}
            placeholder="Ej.: Daniela o La guardería" onChange={event => setName(event.target.value)} />
          <Button type="button" size="sm" variant="outline" disabled={disabled || creating || !name.trim()}
            onClick={() => void create()}>
            {creating ? "Creando…" : "Crear y seleccionar"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Se guardará en Liquidaciones. La deuda se creará al aplicar el extracto.
          </p>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
