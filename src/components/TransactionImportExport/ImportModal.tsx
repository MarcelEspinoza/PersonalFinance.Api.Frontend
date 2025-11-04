import axios from "axios";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

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

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  const handleImport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`/api/template/import?userId=${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
        })

      setPending(response.data.pending || []);
      setImported(response.data.imported || []);
      setStep("result");
    } catch (err) {
      console.error("Error importando:", err);
      setPending([{ description: "Error al procesar el archivo", errors: ["Error inesperado"] }]);
      setImported([]);
      setStep("result");
    }
  };

  const handleClose = () => {
    setFile(null);
    setPending([]);
    setImported([]);
    setStep("upload");
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 space-y-4">
        {step === "upload" && (
          <>
            <h2 className="text-xl font-bold">
              Importar {mode === "income" ? "Ingresos" : "Gastos"}
            </h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                isDragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300"
              }`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-emerald-600">Suelta el archivo aquí...</p>
              ) : file ? (
                <p className="text-slate-700">{file.name}</p>
              ) : (
                <p className="text-slate-500">
                  Arrastra un archivo aquí o haz click para seleccionar
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={handleClose} className="px-4 py-2 bg-slate-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!file}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
              >
                Importar
              </button>
            </div>
          </>
        )}

        {step === "result" && (
          <>
            <h2 className="text-xl font-bold">Resultado de la importación</h2>

            {/* Resumen */}
            <div className="text-slate-700 mb-4">
              <p>
                ✅ Importados: <span className="font-semibold">{imported.length}</span>
              </p>
              <p>
                ⚠️ Pendientes: <span className="font-semibold">{pending.length}</span>
              </p>
            </div>

            {/* Caso éxito total */}
            {pending.length === 0 ? (
              <p className="text-slate-600">
                Todos los registros se importaron correctamente ✅
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600">Registros pendientes de importar:</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 border border-slate-200 text-left">Descripción</th>
                        <th className="px-3 py-2 border border-slate-200 text-left">Monto</th>
                        <th className="px-3 py-2 border border-slate-200 text-left">Fecha</th>
                        <th className="px-3 py-2 border border-slate-200 text-left">Categoría</th>
                        <th className="px-3 py-2 border border-slate-200 text-left">Tipo</th>
                        <th className="px-3 py-2 border border-slate-200 text-left">Errores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((p, idx) => (
                        <tr key={idx} className="odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-2 border border-slate-200">{p.description || "-"}</td>
                          <td className="px-3 py-2 border border-slate-200">{p.amount ?? "-"}</td>
                          <td className="px-3 py-2 border border-slate-200">{p.date ?? "-"}</td>
                          <td className="px-3 py-2 border border-slate-200">{p.categoryId ?? "-"}</td>
                          <td className="px-3 py-2 border border-slate-200">{p.type ?? "-"}</td>
                          <td className="px-3 py-2 border border-slate-200 text-red-600">
                            {p.errors && p.errors.length > 0 ? (
                              <ul className="list-disc pl-4">
                                {p.errors.map((err: string, eIdx: number) => (
                                  <li key={eIdx}>{err}</li>
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
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg"
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
