import { CheckCircle } from "lucide-react";
import { Participant } from "../../services/pasanacoService";

interface ParticipantsListProps {
  participants: Participant[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  if (participants.length === 0)
    return <p className="text-slate-500">No hay participantes</p>;

  return (
    <>
      {participants.map((p) => (
        <div
          key={p.id}
          className={`p-3 border rounded-xl mb-2 ${
            p.has_received ? "bg-green-50" : ""
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{p.name}</span>
            {p.has_received ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <span className="text-slate-500 text-sm">Pendiente</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

