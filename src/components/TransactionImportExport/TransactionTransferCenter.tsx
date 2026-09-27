import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { ImportModal } from "./ImportModal";
import { ExportButton } from "./ExportButton";
import { ExpensesService } from "../../services/expensesService";
import { IncomesService } from "../../services/incomesService";
import { monthName } from "../../utils/civilDate";
import { useAuth } from "../../contexts/AuthContext";
import { LedgerService } from "../../services/ledgerService";

type MovementMode = "income" | "expense";

export function TransactionTransferCenter() {
  const { user } = useAuth();
  const now = new Date();
  const [importOpen, setImportOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState<MovementMode | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const years = Array.from({ length: 15 }, (_, index) => now.getFullYear() + 2 - index);

  const exportMonth = async (mode: MovementMode) => {
    setExporting(mode);
    setExportError(null);
    try {
      const service = mode === "income" ? IncomesService : ExpensesService;
      const [{ data }, accounts] = await Promise.all([
        service.getAll(year, month),
        LedgerService.getAccounts(true),
      ]);
      const accountNames = new Map(
        accounts.map((account) => [
          account.id,
          `${account.name}${account.entity ? ` | ${account.entity}` : ""}`,
        ]),
      );
      const rows = (Array.isArray(data) ? data : []).map((item: any) => ({
        Descripción: item.description ?? item.name ?? "",
        Importe: Number(item.amount ?? 0),
        Fecha: item.date ? String(item.date).slice(0, 10) : "",
        Categoría: item.categoryName ?? item.category ?? "",
        Tipo: item.type ?? "",
        Banco: item.bankName ?? accountNames.get(String(item.bankId ?? item.BankId ?? "")) ?? "",
        Notas: item.notes ?? "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 36 }, { wch: 14 }, { wch: 12 }, { wch: 24 },
        { wch: 14 }, { wch: 24 }, { wch: 36 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, mode === "income" ? "Ingresos" : "Gastos");
      XLSX.writeFile(
        workbook,
        `${mode === "income" ? "ingresos" : "gastos"}-${year}-${String(month).padStart(2, "0")}.xlsx`,
      );
    } catch (error) {
      console.error("Error exporting transactions", error);
      setExportError("No se han podido exportar los movimientos. Inténtalo de nuevo.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Importar con plantilla</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Carga ingresos o gastos desde un archivo CSV o XLSX con las columnas de la plantilla.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Button type="button" variant="outline" className="h-auto w-full justify-start p-4" onClick={() => setImportOpen(true)}>
              <Upload className="text-primary" />
              <span className="text-left">
                <span className="block">Seleccionar archivo</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  El tipo Income o Expense se lee de cada fila
                </span>
              </span>
            </Button>
          </div>

          <div className="mt-5 border-t pt-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              Descargar plantilla
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportButton />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Exportar movimientos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Descarga todos los movimientos de un mes en un Excel listo para archivar o analizar.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="h-9 rounded-md border bg-background px-3 text-sm capitalize">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>{monthName(value)}</option>
              ))}
            </select>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-9 rounded-md border bg-background px-3 text-sm">
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => void exportMonth("income")} disabled={exporting !== null}>
              <TrendingUp className="text-positive" />
              {exporting === "income" ? "Exportando…" : "Exportar ingresos"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void exportMonth("expense")} disabled={exporting !== null}>
              <TrendingDown className="text-negative" />
              {exporting === "expense" ? "Exportando…" : "Exportar gastos"}
            </Button>
          </div>
          {exportError && <p className="mt-3 text-sm text-negative">{exportError}</p>}
        </section>
      </div>

      {importOpen && user && (
        <ImportModal
          show
          onClose={() => setImportOpen(false)}
          userId={user.id}
        />
      )}
    </>
  );
}
