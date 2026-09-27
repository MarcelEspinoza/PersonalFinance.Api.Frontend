import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { pasanacoService } from "../../services/pasanacoService";

export function PasanacoModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState(100);
  const [participants, setParticipants] = useState(5);
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (participants < 2) return setError("Debe haber al menos 2 participantes.");
    if (monthlyAmount <= 0) return setError("El importe mensual debe ser mayor que cero.");

    setLoading(true);
    setError(null);
    try {
      await pasanacoService.create({
        name,
        monthlyAmount: monthlyAmount,
        totalParticipants: participants,
        currentRound: 1,
        startMonth: startMonth,
        startYear: startYear,
      });
      setOpen(false);
      onCreated();
    } catch (err) {
      console.error("Error al crear pasanaco:", err);
      setError("No se pudo crear el pasanaco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nuevo pasanaco
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-xl p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle className="text-xl">Crear pasanaco</DialogTitle>
          <p className="text-sm text-muted-foreground">Define el ciclo; después podrás añadir cada participante y asignarle su turno.</p>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="pasanaco-name">Nombre</Label>
            <Input
              id="pasanaco-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Familia 2027"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pasanaco-amount">Importe mensual</Label>
              <Input
                id="pasanaco-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pasanaco-participants">Participantes</Label>
              <Input
                id="pasanaco-participants"
                type="number"
                min="2"
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pasanaco-month">Mes de inicio</Label>
              <select
                id="pasanaco-month"
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm capitalize"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("es-ES", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pasanaco-year">Año de inicio</Label>
              <Input
                id="pasanaco-year"
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button type="button" disabled={loading} onClick={() => void handleCreate()}>
            {loading ? "Creando…" : "Crear pasanaco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}