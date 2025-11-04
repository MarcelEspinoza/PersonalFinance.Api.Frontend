import axios from "axios";

interface Props {
  mode: "income" | "expense";
}

export function ExportButton({ mode }: Props) {
  const handleExport = async () => {
    try {
      const response = await axios.get("/api/template/export", { responseType: "blob" })

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${mode}-template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exportando plantilla:", err);
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
