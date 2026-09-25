import { useState } from "react";
import { PersonalLoan } from "../../pages/LoansPage/LoansPage";
import { LoansService } from "../../services/loansService";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface Props {
  userId: string;
  initial: PersonalLoan | null;
  onClose: () => void;
  onSaved: () => void;
}

const toInputDate = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().split("T")[0] : "";

const selectClassName =
  "flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function PersonalLoanModal({ userId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    type: initial?.type ?? "given",
    name: initial?.name ?? "",
    principalAmount: initial ? initial.principalAmount.toString() : "",
    outstandingAmount: initial ? initial.outstandingAmount.toString() : "",
    startDate: toInputDate(initial?.startDate) || new Date().toISOString().split("T")[0],
    dueDate: toInputDate(initial?.dueDate),
    status: initial?.status ?? "active",
    categoryId: initial?.categoryId ?? 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      userId: userId,
      type: form.type === "given" ? "Given" : "Received",
      name: form.name,
      principalAmount: parseFloat(form.principalAmount || "0"),
      outstandingAmount: parseFloat(form.outstandingAmount || "0"),
      // enviar fechas en ISO para backend
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      status: form.status,
      categoryId: form.categoryId
    };

    try {
      if (initial) await LoansService.updateLoan(initial.id, payload);
      else await LoansService.createLoan(payload);
      onSaved();
    } catch (e) {
      console.error("Error saving personal loan:", e);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-xl p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle className="text-xl">
            {initial ? "Editar" : "Nuevo"} Préstamo Personal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="personal-loan-type">Tipo</Label>
            <select
              id="personal-loan-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "given" | "received" })}
              className={selectClassName}
            >
              <option value="given">Prestado (yo presté)</option>
              <option value="received">Recibido (me prestaron)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal-loan-name">Nombre / Entidad</Label>
            <Input
              id="personal-loan-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="personal-loan-principal">Monto principal</Label>
              <Input
                id="personal-loan-principal"
                type="number"
                step="0.01"
                value={form.principalAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm({
                    ...form,
                    principalAmount: value,
                    outstandingAmount: initial ? form.outstandingAmount : value,
                  });
                }}
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-loan-outstanding">Monto pendiente</Label>
              <Input
                id="personal-loan-outstanding"
                type="number"
                step="0.01"
                value={form.outstandingAmount}
                onChange={(e) => setForm({ ...form, outstandingAmount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="personal-loan-start-date">Fecha inicio</Label>
              <Input
                id="personal-loan-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-loan-due-date">Fecha devolución (opcional)</Label>
              <Input
                id="personal-loan-due-date"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal-loan-status">Estado</Label>
            <select
              id="personal-loan-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "paid" | "overdue" })}
              className={selectClassName}
            >
              <option value="active">Activo</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>

          <DialogFooter className="gap-2 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{initial ? "Actualizar" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}