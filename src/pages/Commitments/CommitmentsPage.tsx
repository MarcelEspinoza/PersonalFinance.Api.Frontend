import { useEffect, useState } from "react";

import { CommitmentForm } from "../../components/Commitments/CommitmentForm";
import { commitmentService } from "../../services/commitmentService";
import type { CommitmentStatus } from "../../types/CommitmentStatus";

export function CommitmentsPage() {
  const [items, setItems] = useState<CommitmentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await commitmentService.getMonthlyStatus();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Cargando compromisos…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compromisos mensuales</h1>

      <CommitmentForm onSaved={load} />

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3">Esperado</th>
              <th className="p-3">Actual</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.commitmentId} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.expectedAmount.toFixed(2)} €</td>
                <td className="p-3">{c.actualAmount.toFixed(2)} €</td>
                <td className="p-3">
                  {c.isSatisfied
                    ? "🟢 OK"
                    : c.isOutOfRange
                    ? "🔴 Fuera"
                    : "🟡 Parcial"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
