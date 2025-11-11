import apiClient from "../../lib/apiClient";

interface Props {
  mode: "income" | "expense";
}

export function ExportButton({ mode }: Props) {
  const handleExport = async () => {
    try {
      // Usar apiClient (baseURL configurado) y arraybuffer para no corromper el xlsx
      const response = await apiClient.get("/template/export", {
        responseType: "arraybuffer",
      });

      // Determinar mime y nombre del archivo
      const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const filename = `${mode}-template.xlsx`;

      // response puede ser axios response con .data o retorno directo
      const data = (response && (response.data ?? response)) ?? response;

      const blob = new Blob([data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exportando plantilla:", err);
      // opcional: mostrar notificación al usuario
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
    >
      Exportar plantilla
    </button>
  );
}