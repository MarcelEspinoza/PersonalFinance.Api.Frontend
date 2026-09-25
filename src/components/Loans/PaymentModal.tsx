import { useState } from "react";
import { BaseLoan } from "../../pages/LoansPage/LoansPage";
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
  loan: BaseLoan;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentModal({ loan, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1) Registrar pago
      await LoansService.createPayment(loan.id, {
        amount: parseFloat(form.amount),
        paymentDate: form.paymentDate,
        notes: form.notes || null,
      });

      // 2) Actualizar saldo y estado del préstamo
      const newOutstanding = loan.outstandingAmount - parseFloat(form.amount);
      const newStatus = newOutstanding <= 0 ? "paid" : "active";
      await LoansService.updateLoan(loan.id, {
        outstandingAmount: Math.max(0, newOutstanding),
        status: newStatus,
      });

      // 3) TODO: Integrar con gastos/ingresos según tipo
      // - Bancario o personal recibido => crear GASTO (categoría préstamo)
      // - Personal prestado (given) => al recibir pago crear INGRESO (categoría préstamo)
      // Aquí llamarías a tu TransactionsService con la referencia del préstamo en notas.

      onSaved();
    } catch (e) {
      console.error("Error saving payment:", e);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-xl p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle className="text-xl">Registrar Pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Monto del pago</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date">Fecha del pago</Label>
            <Input
              id="payment-date"
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notas (opcional)</Label>
            <textarea
              id="payment-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="flex w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Referencia de préstamo, contrato, etc."
            />
          </div>

          <DialogFooter className="gap-2 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Pago</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}