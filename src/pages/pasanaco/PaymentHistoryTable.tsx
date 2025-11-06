import { Participant, PasanacoPayment } from "../../services/pasanacoService";

interface Props {
  participants: Participant[];
  payments: PasanacoPayment[];
  startMonth: number;
  startYear: number;
  totalRounds: number;
}

function getMonthYear(startMonth: number, startYear: number, round: number) {
  const base = new Date(startYear, startMonth - 1);
  const current = new Date(base.setMonth(base.getMonth() + round - 1));
  return {
    label: current.toLocaleString("es-ES", { month: "long", year: "numeric" }),
    month: current.getMonth() + 1,
    year: current.getFullYear(),
  };
}

export function PaymentHistoryTable({
  participants,
  payments,
  startMonth,
  startYear,
  totalRounds,
}: Props) {
  const rounds = Array.from({ length: totalRounds }, (_, i) =>
    getMonthYear(startMonth, startYear, i + 1)
  );

  return (
    <div className="overflow-auto">
      <table className="min-w-full border border-slate-300 rounded-lg">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left text-sm font-semibold text-slate-700">
              Participante
            </th>
            {rounds.map((r, i) => (
              <th key={i} className="px-3 py-2 text-sm font-semibold text-slate-700">
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 text-sm text-slate-800 font-medium">{p.name}</td>
              {rounds.map((r, i) => {
                const payment = payments.find(
                  (pay) =>
                    pay.participantId === p.id &&
                    pay.month === r.month &&
                    pay.year === r.year
                );
                return (
                  <td key={i} className="px-3 py-2 text-center text-sm">
                    {payment?.paid ? "✔️" : "❌"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
