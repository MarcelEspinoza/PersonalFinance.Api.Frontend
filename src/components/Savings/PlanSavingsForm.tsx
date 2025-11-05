// components/Savings/PlanSavingsForm.tsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { planSavings } from '../../services/savingsService';

export function PlanSavingsForm({ onSuccess }: { onSuccess?: () => void }) {
  const [monthlyAmount, setMonthlyAmount] = useState(100);
  const [months, setMonths] = useState(6);
  const [startDate, setStartDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
    console.error("Usuario no cargado todavía");
    return;
  }
    try {
      setLoading(true);
      await planSavings({
        userId: user.id,
        monthlyAmount,
        months,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error al crear el plan de ahorro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Cantidad mensual (€)</label>
        <input
          type="number"
          value={monthlyAmount}
          onChange={(e) => setMonthlyAmount(Number(e.target.value))}
          className="mt-1 block w-full border border-slate-300 rounded-md p-2"
          min={0}
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Meses</label>
        <input
          type="number"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="mt-1 block w-full border border-slate-300 rounded-md p-2"
          min={1}
          max={24}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Fecha de inicio</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block w-full border border-slate-300 rounded-md p-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar plan'}
      </button>
    </form>
  );
}
