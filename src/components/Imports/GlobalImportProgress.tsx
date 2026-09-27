import { AlertCircle, CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useImportProgress } from "../../contexts/ImportProgressContext";
import { Button } from "../ui/button";

export function GlobalImportProgress() {
  const navigate = useNavigate();
  const {
    status,
    uploadPercentage,
    fileName,
    result,
    error,
    clearImport,
  } = useImportProgress();

  if (status === "idle") return null;

  const working = status === "preparing" || status === "uploading" || status === "processing";
  const title =
    status === "preparing"
      ? "Preparando categorías y reglas"
      : status === "uploading"
      ? `Subiendo archivo · ${uploadPercentage}%`
      : status === "processing"
        ? "Analizando y clasificando movimientos"
        : status === "completed"
          ? "Importación preparada"
          : "La importación ha fallado";

  return (
    <div className="fixed left-4 right-4 top-16 z-50 mx-auto max-w-xl overflow-hidden rounded-xl border bg-card shadow-2xl md:left-auto md:right-6 md:top-4 md:w-[28rem]">
      <div className="flex items-start gap-3 p-4">
        <div className={`mt-0.5 rounded-full p-2 ${
          status === "completed"
            ? "bg-positive-soft text-positive"
            : status === "error"
              ? "bg-negative-soft text-negative"
              : "bg-primary/10 text-primary"
        }`}>
          {status === "completed" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : status === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : status === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{fileName}</p>
            </div>
            {!working && (
              <button
                type="button"
                onClick={clearImport}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Cerrar estado de importación"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {working && (
            <>
              {status === "uploading" ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadPercentage}%` }}
                  />
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  {status === "preparing"
                    ? "Preparando la clasificación…"
                    : "Subida completada. El servidor sigue analizando el archivo…"}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {status === "preparing"
                  ? "Comprobando el plan financiero antes de leer el archivo."
                  : status === "uploading"
                  ? "Puedes seguir usando la aplicación mientras se sube."
                  : "El archivo ya está subido. Puedes cambiar de pantalla mientras el servidor lo procesa."}
              </p>
            </>
          )}

          {status === "completed" && result && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {result.acceptedRows} filas listas para revisar.
              </p>
              <Button type="button" size="sm" onClick={() => navigate("/imports")}>
                Revisar
              </Button>
            </div>
          )}

          {status === "error" && (
            <p className="mt-2 text-xs text-negative">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
