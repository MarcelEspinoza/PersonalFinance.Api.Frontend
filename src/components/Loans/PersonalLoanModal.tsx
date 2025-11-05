import { X } from "lucide-react";
import { useState } from "react";
import { PersonalLoan } from "../../pages/LoansPage/LoansPage";
import { LoansService } from "../../services/loansService";

interface Props {
  userId: string;
  initial: PersonalLoan | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PersonalLoanModal({ userId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    type: initial?.type ?? "given",
    name: initial?.name ?? "",
    principal_amount: initial ? initial.principalAmount.toString() : "",
    outstanding_amount: initial ? initial.outstandingAmount.toString() : "",
    start_date: initial?.startDate ?? new Date().toISOString().split("T")[0],
    due_date: initial?.dueDate ?? "",
    status: initial?.status ?? "active",
    categoryId: 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
    UserId: userId, 
    Type: form.type === "given" ? "Given" : "Received",
    Name: form.name,
    PrincipalAmount: parseFloat(form.principal_amount || "0"),
    OutstandingAmount: parseFloat(form.outstanding_amount || "0"),
    StartDate: form.start_date, // "2025-11-04"
    DueDate: form.due_date ? form.due_date : null,
    Status: form.status,
    CategoryId: 100
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {initial ? "Editar" : "Nuevo"} Préstamo Personal
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "given" | "received" })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="given">Prestado (yo presté)</option>
              <option value="received">Recibido (me prestaron)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre / Entidad</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Monto principal</label>
              <input
                type="number"
                step="0.01"
                value={form.principal_amount}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm({
                    ...form,
                    principal_amount: value,
                    outstanding_amount: initial ? form.outstanding_amount : value,
                  });
                }}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Monto pendiente</label>
              <input
                type="number"
                step="0.01"
                value={form.outstanding_amount}
                onChange={(e) => setForm({ ...form, outstanding_amount: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha devolución (opcional)</label>
              <input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "paid" | "overdue" })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
            >
              {initial ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
