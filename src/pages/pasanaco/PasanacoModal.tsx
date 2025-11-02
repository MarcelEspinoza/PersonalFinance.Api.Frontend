import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { DialogHeader } from "../../components/ui/dialog";
import { pasanacoService } from "../../services/pasanacoService";

  
  export function PasanacoModal({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [monthlyAmount, setMonthlyAmount] = useState(100);
    const [participants, setParticipants] = useState(5);
    const [loading, setLoading] = useState(false);
  
    const handleCreate = async () => {
      if (!name.trim()) return alert("El nombre es obligatorio");
      setLoading(true);
      try {
        await pasanacoService.create({
          name,
          monthly_amount: monthlyAmount,
          total_participants: participants,
          current_round: 1,
        });
        setOpen(false);
        onCreated();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            + Nuevo Pasanaco
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear nuevo Pasanaco</DialogTitle>
          </DialogHeader>
  
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Ej: Pasanaco Amigos 2025"
              />
            </div>
  
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monto mensual (€)
                </label>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Participantes
                </label>
                <input
                  type="number"
                  value={participants}
                  onChange={(e) => setParticipants(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
  
            <Button
              disabled={loading}
              onClick={handleCreate}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? "Creando..." : "Crear Pasanaco"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  