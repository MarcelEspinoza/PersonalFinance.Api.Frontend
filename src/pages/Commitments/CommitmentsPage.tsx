import { useEffect, useState } from "react";
import { CommitmentForm } from "../../components/Commitments/CommitmentForm";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
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
      return <span className="font-semibold text-negative">❌ Fuera de rango</span>;
    }
    if (c.isSatisfied) {
      return <span className="font-semibold text-positive">✅ Cumplido</span>;
    }
    return <span className="font-semibold text-warning">⏳ Pendiente</span>;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Compromisos mensuales" />

      <Card>
        <CardContent className="p-5">
          <CommitmentForm onSaved={load} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Compromiso</th>
                  <th className="px-5 py-3 text-right font-medium">Esperado</th>
                  <th className="px-5 py-3 text-right font-medium">Real</th>
                  <th className="px-5 py-3 text-center font-medium">Estado</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                      No hay compromisos activos este mes
                    </td>
                  </tr>
                )}

                {items.map((c) => (
                  <tr key={c.commitmentId} className="border-t transition-colors hover:bg-muted/60">
                    <td className="px-5 py-4 font-medium text-foreground">
                      {c.name}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums">
                      {c.expectedAmount.toFixed(2)} €
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums">
                      {c.actualAmount.toFixed(2)} €
                    </td>

                    <td className="px-5 py-4 text-center">
                      {renderStatus(c)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Los compromisos comparan importes esperados con los movimientos reales del mes,
        teniendo en cuenta tolerancias configuradas.
      </p>
    </div>
  );
}