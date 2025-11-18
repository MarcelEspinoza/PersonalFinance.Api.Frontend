import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { excelService } from "../../services/excelService";

interface Props {
  mode: "income" | "expense";
  show: boolean;
  onClose: () => void;
  userId: string;
}

export function ImportModal({ mode, show, onClose, userId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [imported, setImported] = useState<any[]>([]);
  const [step, setStep] = useState<"upload" | "result">("upload");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  // Close on ESC
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, file, step]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setErrorMessage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) {
      setErrorMessage("Selecciona un archivo .xlsx o .xls antes de importar.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Excel service should upload file and return { imported: [], pending: [] } (axios response)
      const response = await excelService.importFile(file, userId);
      const data = response?.data ?? response ?? {};

      setPending(Array.isArray(data.pending) ? data.pending : []);
      setImported(Array.isArray(data.imported) ? data.imported : []);
      setStep("result");
    } catch (err: any) {
      console.error("Error importando archivo", err);
      setPending([{ description: "Error al procesar el archivo", errors: [normalizeError(err)] }]);
      setImported([]);
      setStep("result");
    } finally {
      setLoading(false);
    }
  };

  // Small helper to convert axios errors to string
  function normalizeError(err: any) {
    return err?.response?.data?.message ?? err?.message ?? String(err);
  }

  const handleClose = () => {
    setFile(null);
    setPending([]);
    setImported([]);
    setStep("upload");
    setErrorMessage(null);
    onClose();
  };

  // If modal not shown, render nothing
  if (!show) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40"
      onMouseDown={(e) => {
        // close when clicking on overlay (but not when clicking inside the panel)
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 space-y-4
                   max-h-[calc(100vh-6rem)] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {step === "upload" && (
          <>
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold">
                Importar {mode === "income" ? "Ingresos" : "Gastos"}
              </h2>
              <button
                aria-label="Cerrar"
                onClick={handleClose}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`}
            >
              <input {...getInputProps()} aria-label="Seleccionar archivo Excel" />
              {isDragActive ? (
                <p className="text-emerald-600">Suelta el archivo aquí...</p>
              ) : file ? (
                <div className="text-left">
                  <p className="text-slate-700 font-medium">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <p className="text-slate-500">
                  Arrastra un archivo .xlsx/.xls aquí o haz click para seleccionar
                </p>
              )}
            </div>

            {errorMessage && (
              <div className="text-sm text-rose-600 mt-1">{errorMessage}</div>
            )}

            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-slate-500">
                Formato esperado: hoja con columnas (description, amount, date, categoryId/ categoryName, type)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-200 rounded-lg text-sm"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 text-sm"
                >
                  {loading ? "Importando..." : "Importar"}
                </button>
              </div>
            </div>
          </>
        )}

        {step === "result" && (
          <>
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold">Resultado de la importación</h2>
              <button
                aria-label="Cerrar"
                onClick={handleClose}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="text-slate-700 mb-2">
              <p>
                ✅ Importados: <span className="font-semibold">{imported.length}</span>
              </p>
              <p>
                ⚠️ Pendientes: <span className="font-semibold">{pending.length}</span>
              </p>
            </div>

            {pending.length === 0 ? (
              <div className="text-slate-600">
                <p>Todos los registros se importaron correctamente ✅</p>
                {imported.length > 0 && (
                  <div className="mt-2 text-sm text-slate-500">
                    Se han importado {imported.length} registros.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600">Registros pendientes de importar:</p>

                {/* constrain table area height and allow internal scrolling */}
                <div className="overflow-x-auto border rounded-md">
                  <div className="max-h-[40vh] overflow-auto">
                    <table className="min-w-full table-fixed text-sm">
                      <thead className="bg-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 border-b border-slate-200 text-left">Descripción</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-left">Monto</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-left">Fecha</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-left">Categoría</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-left">Tipo</th>
                          <th className="px-3 py-2 border-b border-slate-200 text-left">Errores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((p, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="px-3 py-2 align-top break-words max-w-[220px]">{p.description ?? "-"}</td>
                            <td className="px-3 py-2 align-top">{p.amount ?? "-"}</td>
                            <td className="px-3 py-2 align-top">{p.date ?? "-"}</td>
                            <td className="px-3 py-2 align-top">
                              {p.category ?? p.categoryId ?? "-"}
                            </td>
                            <td className="px-3 py-2 align-top">{p.type ?? "-"}</td>
                            <td className="px-3 py-2 align-top text-rose-600">
                              {p.errors && p.errors.length > 0 ? (
                                <ul className="list-disc pl-4">
                                  {p.errors.map((err: string, eIdx: number) => (
                                    <li key={eIdx} className="text-xs">{err}</li>
                                  ))}
                                </ul>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => {
                  // allow user to try again: go back to upload step keeping file selected
                  setStep("upload");
                  setPending([]);
                  setImported([]);
                }}
                className="px-4 py-2 bg-white border rounded text-slate-700"
              >
                Volver
              </button>

              <button
                onClick={handleClose}
                className="px-4 py-2 bg-emerald-500 text-white rounded"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}