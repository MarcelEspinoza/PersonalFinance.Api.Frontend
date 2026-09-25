import { useState } from "react";
import { BankLoan } from "../../pages/LoansPage/LoansPage";
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
  initial: BankLoan | null;
  onClose: () => void;
  onSaved: () => void;
}

const toInputDate = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().split("T")[0] : "";

const selectClassName =
  "flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function BankLoanModal({ userId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    type: "bank" as const,
    name: initial?.name ?? "",
    principalAmount: initial ? initial.principalAmount.toString() : "",
    outstandingAmount: initial ? initial.outstandingAmount.toString() : "",
    interestRate: initial?.interestRate?.toString() ?? "0",
    tae: initial?.tae?.toString() ?? "",
    installmentsPaid: initial?.installmentsPaid?.toString() ?? "",
    installmentsRemaining: initial?.installmentsRemaining?.toString() ?? "",
    nextPaymentAmount: initial?.nextPaymentAmount?.toString() ?? "",
    nextPaymentDate: toInputDate(initial?.nextPaymentDate),
    startDate: toInputDate(initial?.startDate) || new Date().toISOString().split("T")[0],
    dueDate: toInputDate(initial?.dueDate),
    status: initial?.status ?? "active",
    categoryId: initial?.categoryId ?? 101
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Construimos el payload con camelCase y fechas en ISO (Z)
    const payload = {
      userId: userId,
      type: "bank",
      name: form.name,
      principalAmount: parseFloat(form.principalAmount || "0"),
      outstandingAmount: parseFloat(form.outstandingAmount || "0"),
      interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
      tae: form.tae ? parseFloat(form.tae) : null,
      installmentsPaid: form.installmentsPaid ? parseInt(form.installmentsPaid) : null,
      installmentsRemaining: form.installmentsRemaining ? parseInt(form.installmentsRemaining) : null,
      nextPaymentAmount: form.nextPaymentAmount ? parseFloat(form.nextPaymentAmount) : null,
      // Enviar fechas como ISO completos para evitar problemas de Kind/offset
      nextPaymentDate: form.nextPaymentDate ? new Date(form.nextPaymentDate).toISOString() : null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      status: form.status as "active" | "paid" | "overdue",
      categoryId: form.categoryId
    };

    try {
      if (initial) await LoansService.updateLoan(initial.id, payload);
      else await LoansService.createLoan(payload);
      onSaved();
    } catch (e) {
      console.error("Error saving bank loan:", e);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto rounded-xl p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle className="text-xl">
            {initial ? "Editar" : "Nuevo"} Préstamo Bancario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="bank-loan-name">Entidad / Nombre</Label>
            <Input
              id="bank-loan-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Ej: BBVA - Préstamo inmediato"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank-loan-principal">Capital inicial</Label>
              <Input
                id="bank-loan-principal"
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-loan-outstanding">Capital pendiente</Label>
              <Input
                id="bank-loan-outstanding"
                type="number"
                step="0.01"
                value={form.outstandingAmount}
                onChange={(e) => setForm({ ...form, outstandingAmount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bank-loan-interest-rate">Interés nominal (%)</Label>
              <Input
                id="bank-loan-interest-rate"
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-loan-tae">TAE (%)</Label>
              <Input
                id="bank-loan-tae"
                type="number"
                step="0.01"
                value={form.tae}
                onChange={(e) => setForm({ ...form, tae: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-loan-next-payment-amount">Próxima cuota (€)</Label>
              <Input
                id="bank-loan-next-payment-amount"
                type="number"
                step="0.01"
                value={form.nextPaymentAmount}
                onChange={(e) => setForm({ ...form, nextPaymentAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bank-loan-installments-paid">Cuotas pagadas</Label>
              <Input
                id="bank-loan-installments-paid"
                type="number"
                value={form.installmentsPaid}
                onChange={(e) => setForm({ ...form, installmentsPaid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-loan-installments-remaining">Cuotas pendientes</Label>
              <Input
                id="bank-loan-installments-remaining"
                type="number"
                value={form.installmentsRemaining}
                onChange={(e) => setForm({ ...form, installmentsRemaining: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-loan-next-payment-date">Fecha próxima cuota</Label>
              <Input
                id="bank-loan-next-payment-date"
                type="date"
                value={form.nextPaymentDate}
                onChange={(e) => setForm({ ...form, nextPaymentDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank-loan-start-date">Fecha inicio</Label>
              <Input
                id="bank-loan-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-loan-due-date">Fecha fin</Label>
              <Input
                id="bank-loan-due-date"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank-loan-status">Estado</Label>
            <select
              id="bank-loan-status"
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