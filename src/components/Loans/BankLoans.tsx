import { Edit2, Trash2 } from "lucide-react";
import { BankLoan } from "../../pages/LoansPage/LoansPage";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

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
      <h2 className="text-lg font-semibold tracking-tight">Préstamos Bancarios</h2>
      <Card className="overflow-hidden">
        {loans.length === 0 ? (
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay préstamos bancarios registrados
          </CardContent>
        ) : (
          <div className="divide-y">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className={`cursor-pointer p-5 transition-colors ${
                  selectedId === loan.id ? "bg-accent" : "hover:bg-accent"
                }`}
                onClick={() => onSelect(loan.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        Bancario
                      </span>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          loan.status === "paid"
                            ? "bg-secondary text-secondary-foreground"
                            : loan.status === "overdue"
                            ? "bg-warning-soft text-warning"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {loan.status === "paid"
                          ? "Pagado"
                          : loan.status === "overdue"
                          ? "Vencido"
                          : "Activo"}
                      </span>
                    </div>
                    <p className="font-semibold text-card-foreground">{loan.name}</p>

                    <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
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
                          Fecha próxima: {" "}
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
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(loan);
                      }}
                      aria-label={`Editar ${loan.name}`}
                    >
                      <Edit2 />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(loan.id);
                      }}
                      aria-label={`Eliminar ${loan.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}