import { useEffect, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import {
  Participant,
  Pasanaco,
  PasanacoPayment,
  pasanacoService,
} from "../../services/pasanacoService";
import { PasanacoDetail } from "./PasanacoDetail";
import { PasanacoList } from "./PasanacoList";
import { PasanacoModal } from "./PasanacoModal";

export function PasanacoPage() {
  const { user } = useAuth();
  const [pasanacos, setPasanacos] = useState<Pasanaco[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<PasanacoPayment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga la lista de pasanacos y devuelve los datos (para uso por callers)
  const loadPasanacos = async (): Promise<Pasanaco[]> => {
    setLoading(true);
    try {
      const { data } = await pasanacoService.getAll();
      setPasanacos(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current)
          ? current
          : data[0]?.id ?? null
      );
      return data;
    } catch (err) {
      console.error("Error al cargar pasanacos:", err);
      return [] as Pasanaco[];
    } finally {
      setLoading(false);
    }
  };

  // Recarga la lista y, si hay un seleccionado, recarga participantes y pagos del seleccionado.
  const refreshAll = async () => {
    const data = await loadPasanacos();
    if (!selectedId) {
      setParticipants([]);
      setPayments([]);
      return;
    }

    const pasanaco = data.find((p) => p.id === selectedId);
    if (!pasanaco) {
      setSelectedId(null);
      setParticipants([]);
      setPayments([]);
      return;
    }

    try {
      const { month, year } = getCurrentGameMonth(
        pasanaco.startMonth,
        pasanaco.startYear,
        pasanaco.currentRound
      );
      const [partRes, payRes] = await Promise.all([
        pasanacoService.getParticipants(selectedId),
        pasanacoService.getPayments(selectedId, month, year),
      ]);
      setParticipants(partRes.data);
      setPayments(payRes.data);
    } catch (err) {
      console.error("Error al cargar datos tras refresh:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este pasanaco?")) return;

    try {
      await pasanacoService.remove(id);
      // eliminado ok
      setPasanacos((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      // si 400 con related summary -> mostrar confirm y permitir force
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 400 && data?.related) {
        const r = data.related;
        const text = `No se puede eliminar: existen registros relacionados.\nPagos: ${r.paymentsCount}\nPréstamos: ${r.loansCount}\nGastos: ${r.expensesCount}\nIngresos: ${r.incomesCount}\n\n¿Deseas forzar el borrado (eliminar todo)? Esta acción es irreversible.`;
        if (!confirm(text)) return;
        try {
          await pasanacoService.remove(id, true); // force=true
          setPasanacos((prev) => prev.filter((p) => p.id !== id));
          if (selectedId === id) setSelectedId(null);
        } catch (err2: any) {
          console.error("Error borrando con force:", err2);
          alert(err2?.response?.data || "No se pudo forzar el borrado");
        }
        return;
      }

      console.error("Error al eliminar:", err);
      alert(err?.response?.data || "Error al eliminar pasanaco");
    }
  };

  useEffect(() => {
    if (user) loadPasanacos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!selectedId) {
      setParticipants([]);
      setPayments([]);
      return;
    }
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selected = pasanacos.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pasanaco"
        description="Gestiona participantes, turnos y pagos sin perder de vista el estado de la ronda."
        actions={<PasanacoModal onCreated={loadPasanacos} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Tus grupos</h2>
            <p className="text-sm text-muted-foreground">{pasanacos.length} pasanacos registrados</p>
          </div>
          <PasanacoList
            pasanacos={pasanacos}
            selectedPasanaco={selectedId}
            loading={loading}
            onSelect={setSelectedId}
            onDelete={handleDelete}
          />
        </div>

        <div>
          {selected ? (
            <PasanacoDetail
              pasanaco={selected}
              participants={participants}
              payments={payments}
              onRefresh={refreshAll}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-muted-foreground">
                Selecciona un pasanaco para ver detalles.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Reutilizamos la lógica del mes actual
export function getCurrentGameMonth(
  startMonth: number,
  startYear: number,
  round: number
) {
  if (
    typeof startMonth !== "number" ||
    typeof startYear !== "number" ||
    typeof round !== "number" ||
    startMonth < 1 ||
    startMonth > 12 ||
    startYear < 2000 ||
    round < 1
  ) {
    return { month: NaN, year: NaN };
  }

  const base = new Date(startYear, startMonth - 1);
  const current = new Date(base.setMonth(base.getMonth() + round - 1));
  return { month: current.getMonth() + 1, year: current.getFullYear() };
}