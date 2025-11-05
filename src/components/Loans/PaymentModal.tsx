import { X } from "lucide-react";
import { useState } from "react";
import { BaseLoan } from "../../pages/LoansPage/LoansPage";
import { LoansService } from "../../services/loansService";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Registrar Pago</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Monto del pago</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Fecha del pago</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Referencia de préstamo, contrato, etc."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
            >
              Guardar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
