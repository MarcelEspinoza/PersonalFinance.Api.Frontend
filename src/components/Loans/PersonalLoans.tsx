import { Edit2, Trash2 } from "lucide-react";
import { PersonalLoan } from "../../pages/LoansPage/LoansPage";

interface Props {
  loans: PersonalLoan[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (loan: PersonalLoan) => void;
  onDelete: (id: string) => void;
}

const getTypeLabel = (type: "given" | "received") =>
  type === "given" ? "Prestado (yo presté)" : "Recibido (me prestaron)";

const getTypeColor = (type: "given" | "received") =>
  type === "given" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700";

export default function PersonalLoans({
  loans,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Préstamos Personales</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-200">
        {loans.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay préstamos personales registrados
          </div>
        ) : (
          loans.map((loan) => (
            <div
              key={loan.id}
              className={`p-4 cursor-pointer transition ${
                selectedId === loan.id ? "bg-emerald-50" : "hover:bg-slate-50"
              }`}
              onClick={() => onSelect(loan.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${getTypeColor(
                        loan.type
                      )}`}
                    >
                      {getTypeLabel(loan.type)}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        loan.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : loan.status === "overdue"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {loan.status === "paid"
                        ? "Pagado"
                        : loan.status === "overdue"
                        ? "Vencido"
                        : "Activo"}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800">{loan.name}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                    <span>Principal: {loan.principalAmount.toFixed(2)} €</span>
                    <span>•</span>
                    <span>Pendiente: {loan.outstandingAmount.toFixed(2)} €</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    <span>
                      Inicio: {new Date(loan.startDate).toLocaleDateString("es-ES")}
                    </span>
                    {loan.dueDate && (
                      <>
                        <span> • </span>
                        <span>
                          Devolución: {new Date(loan.dueDate).toLocaleDateString("es-ES")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(loan);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(loan.id);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
