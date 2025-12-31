import { useEffect, useState } from "react";
import { CommitmentForm } from "../../components/Commitments/CommitmentForm";
import { commitmentService } from "../../services/commitmentService";
import type { CommitmentStatus } from "../../types/CommitmentStatus";

export function CommitmentsPage() {
  const [items, setItems] = useState<CommitmentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await commitmentService.getMonthlyStatus();
      setItems(data);
    } catch (err) {
      console.error("Error loading commitments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderStatus = (c: CommitmentStatus) => {
    if (c.isOutOfRange) {
      return <span className="text-red-600 font-semibold">❌ Fuera de rango</span>;
    }
    if (c.isSatisfied) {
      return <span className="text-emerald-600 font-semibold">✅ Cumplido</span>;
    }
    return <span className="text-yellow-600 font-semibold">⏳ Pendiente</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Compromisos mensuales</h1>
      </div>

      {/* Form */}
      <div className="bg-white border rounded-xl p-4">
        <CommitmentForm onSaved={load} />
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3 text-left">Compromiso</th>
              <th className="p-3 text-right">Esperado</th>
              <th className="p-3 text-right">Real</th>
              <th className="p-3 text-center">Estado</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  No hay compromisos activos este mes
                </td>
              </tr>
            )}

            {items.map((c) => (
              <tr key={c.commitmentId} className="border-t">
                <td className="p-3 font-medium text-slate-800">
                  {c.name}
                </td>

                <td className="p-3 text-right">
                  {c.expectedAmount.toFixed(2)} €
                </td>

                <td className="p-3 text-right">
                  {c.actualAmount.toFixed(2)} €
                </td>

                <td className="p-3 text-center">
                  {renderStatus(c)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500">
        Los compromisos comparan importes esperados con los movimientos reales del mes,
        teniendo en cuenta tolerancias configuradas.
      </div>
    </div>
  );
}
