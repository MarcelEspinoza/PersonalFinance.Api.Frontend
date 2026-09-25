import { Edit2, Trash2 } from "lucide-react";
import { PersonalLoan } from "../../pages/LoansPage/LoansPage";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface Props {
  loans: PersonalLoan[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (loan: PersonalLoan) => void;
  onDelete: (id: string) => void;
}

const getTypeLabel = (type: "given" | "received") =>
  type === "given" ? "Prestado (yo presté)" : "Recibido (me prestaron)";

export default function PersonalLoans({
  loans,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Préstamos Personales</h2>
      <Card className="overflow-hidden">
        {loans.length === 0 ? (
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay préstamos personales registrados
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
                        {getTypeLabel(loan.type)}
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
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Principal: {loan.principalAmount.toFixed(2)} €</span>
                      <span>Pendiente: {loan.outstandingAmount.toFixed(2)} €</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        Inicio: {new Date(loan.startDate).toLocaleDateString("es-ES")}
                      </span>
                      {loan.dueDate && (
                        <span>
                          Devolución: {new Date(loan.dueDate).toLocaleDateString("es-ES")}
                        </span>
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