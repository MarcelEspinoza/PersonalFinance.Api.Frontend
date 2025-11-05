import { Edit2, Trash2 } from "lucide-react";
import { BankLoan } from "../../pages/LoansPage/LoansPage";

interface Props {
  loans: BankLoan[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (loan: BankLoan) => void;
  onDelete: (id: string) => void;
}

export default function BankLoans({
  loans,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Préstamos Bancarios</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-200">
        {loans.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay préstamos bancarios registrados
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
                    <span className="text-xs px-2 py-1 rounded font-medium bg-purple-100 text-purple-700">
                      Bancario
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

                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mt-2">
                    <div>Principal: {loan.principalAmount.toFixed(2)} €</div>
                    <div>Pendiente: {loan.outstandingAmount.toFixed(2)} €</div>
                    {loan.interestRate > 0 && (
                      <div>Interés nominal: {loan.interestRate}%</div>
                    )}
                    {loan.tae && <div>TAE: {loan.tae}%</div>}
                    {loan.installmentsPaid !== undefined && (
                      <div>Cuotas pagadas: {loan.installmentsPaid}</div>
                    )}
                    {loan.installmentsRemaining !== undefined && (
                      <div>Cuotas pendientes: {loan.installmentsRemaining}</div>
                    )}
                    {loan.nextPaymentAmount && (
                      <div>Próxima cuota: {loan.nextPaymentAmount} €</div>
                    )}
                    {loan.nextPaymentDate && (
                      <div>
                        Fecha próxima:{" "}
                        {new Date(loan.nextPaymentDate).toLocaleDateString("es-ES")}
                      </div>
                    )}
                    <div>
                      Inicio: {new Date(loan.startDate).toLocaleDateString("es-ES")}
                    </div>
                    {loan.dueDate && (
                      <div>
                        Fin: {new Date(loan.dueDate).toLocaleDateString("es-ES")}
                      </div>
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
