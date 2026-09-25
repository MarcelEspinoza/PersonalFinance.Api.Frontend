import { Download } from "lucide-react";
import { Button } from "../ui/button";
import apiClient from "../../lib/apiClient";

interface Props {
  mode: "income" | "expense";
}

export function ExportButton({ mode }: Props) {
  const handleExport = async () => {
    try {
      const response = await apiClient.get("/template/export", {
        responseType: "arraybuffer",
      });

      const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const filename = `${mode}-template.xlsx`;
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
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Exportar plantilla
    </Button>
  );
}
