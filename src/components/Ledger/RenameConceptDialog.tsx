import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface Props {
  open: boolean;
  currentName: string;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}

export function RenameConceptDialog({ open, currentName, busy, error, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const trimmed = name.trim();
  const canSubmit = !busy && trimmed.length > 0 && trimmed !== currentName;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border bg-card p-6 shadow-xl sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Renombrar concepto</DialogTitle>
            <DialogDescription>
              El nombre nuevo se usa en todos los meses y en lo que queda pendiente. Lo ya pagado
              no cambia.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-5">
            <Label htmlFor="concept-name">Nombre</Label>
            <Input
              id="concept-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {error && (
              <p className="mt-3 rounded-lg border border-negative/25 bg-negative-soft p-3 text-sm text-negative">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
