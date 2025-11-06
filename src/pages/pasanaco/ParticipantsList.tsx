import { CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Participant, PasanacoPayment, pasanacoService } from "../../services/pasanacoService";

interface ParticipantWithPayment extends Participant {
  payment?: PasanacoPayment;
}

interface Props {
  participants: ParticipantWithPayment[];
  onRefresh: () => void;
}

export function ParticipantsList({ participants, onRefresh }: Props) {
  const [marking, setMarking] = useState<string | null>(null);

  if (participants.length === 0)
    return <p className="text-slate-500">No hay participantes registrados</p>;

  return (
    <div className="space-y-2">
      {participants.map((p) => {
        const isPaid = p.payment?.paid;
        const paymentDate = p.payment?.paymentDate
          ? new Date(p.payment.paymentDate).toLocaleDateString("es-ES")
          : null;

        return (
          <div
            key={p.id}
            className={`p-3 border rounded-xl flex justify-between items-center ${
              isPaid ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300"
            }`}
          >
            <div>
              <p className="font-medium text-slate-800">
                {p.name} — Nº {p.assignedNumber}
              </p>
              {isPaid && paymentDate && (
                <p className="text-sm text-slate-500">Pagado el {paymentDate}</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              {isPaid ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 text-sm font-semibold">Pagado</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-700 text-sm font-semibold">Pendiente</span>
                  </div>

                  {p.payment?.id && (
                    <Button
                      size="sm"
                      disabled={marking === p.id}
                      className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={async () => {
                        setMarking(p.id);
                        try {
                          await pasanacoService.markPaymentAsPaid(p.payment!.id);
                          onRefresh();
                        } catch (err) {
                          alert("Error al marcar como pagado");
                          console.error(err);
                        } finally {
                          setMarking(null);
                        }
                      }}
                    >
                      {marking === p.id ? "Registrando..." : "Marcar como pagado"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
