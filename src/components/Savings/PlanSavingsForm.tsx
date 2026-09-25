// components/Savings/PlanSavingsForm.tsx
import { useState } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="space-y-2">
        <Label htmlFor="monthly-amount">Cantidad mensual (€)</Label>
        <Input
          id="monthly-amount"
          type="number"
          value={monthlyAmount}
          onChange={(e) => setMonthlyAmount(Number(e.target.value))}
          min={0}
          step="0.01"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="savings-months">Meses</Label>
        <Input
          id="savings-months"
          type="number"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          min={1}
          max={24}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="savings-start-date">Fecha de inicio</Label>
        <Input
          id="savings-start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Guardando...' : 'Guardar plan'}
      </Button>
    </form>
  );
}