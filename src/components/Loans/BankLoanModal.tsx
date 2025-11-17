import { X } from "lucide-react";
import { useState } from "react";
import { BankLoan } from "../../pages/LoansPage/LoansPage";
import { LoansService } from "../../services/loansService";

interface Props {
  userId: string;
  initial: BankLoan | null;
  onClose: () => void;
  onSaved: () => void;
}

const toInputDate = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().split("T")[0] : "";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {initial ? "Editar" : "Nuevo"} Préstamo Bancario
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Entidad / Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: BBVA - Préstamo inmediato"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Capital inicial</label>
              <input
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Capital pendiente</label>
              <input
                type="number"
                step="0.01"
                value={form.outstandingAmount}
                onChange={(e) => setForm({ ...form, outstandingAmount: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Interés nominal (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TAE (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.tae}
                onChange={(e) => setForm({ ...form, tae: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Próxima cuota (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.nextPaymentAmount}
                onChange={(e) => setForm({ ...form, nextPaymentAmount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cuotas pagadas</label>
              <input
                type="number"
                value={form.installmentsPaid}
                onChange={(e) => setForm({ ...form, installmentsPaid: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cuotas pendientes</label>
              <input
                type="number"
                value={form.installmentsRemaining}
                onChange={(e) => setForm({ ...form, installmentsRemaining: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha próxima cuota</label>
              <input
                type="date"
                value={form.nextPaymentDate}
                onChange={(e) => setForm({ ...form, nextPaymentDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha fin</label>
              <input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "paid" | "overdue" })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="active">Activo</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
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
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              {initial ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}