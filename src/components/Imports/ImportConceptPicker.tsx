import { useId, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { ImportConceptOption } from "../../types/ledger";
import { cn, normalizeSearchText } from "../../lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";

interface ImportConceptPickerProps {
  concepts: ImportConceptOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  showKind?: boolean;
  className?: string;
  id?: string;
  label?: string;
  dataTour?: string;
}

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

const kindLabel = (kind: string) => {
  if (kind.toLowerCase() === "income") return "Ingreso";
  if (kind.toLowerCase() === "transfer") return "Traspaso";
  return "Gasto";
};

export function ImportConceptPicker({
  concepts, value, onChange, disabled = false, required = false,
  placeholder = "Sin concepto (revisar)", showKind = true, className,
  id, label = "Categoría", dataTour,
}: ImportConceptPickerProps) {
  const generatedId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => [...concepts].sort((left, right) =>
    collator.compare(kindLabel(left.kind), kindLabel(right.kind)) ||
    collator.compare(left.name, right.name) || collator.compare(left.id, right.id)), [concepts]);
  const filtered = useMemo(() => {
    const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    return sorted.filter(concept => {
      const text = normalizeSearchText(`${kindLabel(concept.kind)} ${concept.name}`);
      return terms.every(term => text.includes(term));
    });
  }, [sorted, query]);
  const optionLabel = (concept: ImportConceptOption) =>
    showKind ? `${kindLabel(concept.kind)} · ${concept.name}` : concept.name;
  const choose = (conceptId: string) => {
    setOpen(false);
    if (conceptId !== value) onChange(conceptId);
  };

  return (
    <Dialog open={open} onOpenChange={next => {
      if (next) setQuery("");
      setOpen(next);
    }}>
      <div className={cn("flex h-9 min-w-0 items-stretch gap-1", className)}>
        <select
          id={id ?? generatedId}
          aria-label={label}
          data-tour={dataTour}
          className="h-full min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          value={value}
          disabled={disabled}
          required={required}
          onChange={event => onChange(event.target.value)}
        >
          <option value="">{placeholder}</option>
          {sorted.map(concept => <option key={concept.id} value={concept.id}>{optionLabel(concept)}</option>)}
        </select>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-full w-9 shrink-0"
            disabled={disabled} title="Buscar categoría" aria-label="Buscar categoría">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar categoría</DialogTitle>
          <DialogDescription>Busca por nombre o por tipo: gasto, ingreso o traspaso.</DialogDescription>
        </DialogHeader>
        <Input type="search" autoFocus aria-label="Buscar categorías" placeholder="Escribe para buscar…"
          value={query} onChange={event => setQuery(event.target.value)} />
        <div className="max-h-[min(55vh,24rem)] overflow-y-auto rounded-md border p-1">
          {!required && (
            <div className="mb-1 border-b pb-1">
              <Button type="button" variant="ghost" className="w-full justify-start font-normal"
                disabled={disabled} onClick={() => choose("")}>{placeholder}</Button>
            </div>
          )}
          {filtered.length === 0 ? (
            <p role="status" className="p-3 text-sm text-muted-foreground">No hay categorías que coincidan.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map(concept => (
                <li key={concept.id}>
                  <Button type="button" variant="ghost" aria-pressed={value === concept.id}
                    className={cn("h-auto w-full justify-between whitespace-normal px-3 py-2 text-left font-normal",
                      value === concept.id && "bg-muted")}
                    disabled={disabled} onClick={() => choose(concept.id)}>
                    <span>{optionLabel(concept)}</span>
                    {value === concept.id && <Check className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
