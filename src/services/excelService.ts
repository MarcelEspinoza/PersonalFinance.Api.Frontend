import { AxiosResponse } from "axios";
import * as XLSX from "xlsx";
import apiClient from "../lib/apiClient";

export const excelService = {
  // Mantengo la exportación local (útil para plantillas rápidas)
  exportTemplate: (mode: "income" | "expense") => {
    const headers = [
      ["description", "amount", "date", "category", "notes", "type", "movementType", "bank", "isTransfer", "counterpartyBank", "transferReference"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `${mode}-template.xlsx`);
  },
  importFile: async (file: File, userId: string): Promise<AxiosResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);

    // usar apiClient (configurado con baseURL/proxy)
    const res = await apiClient.post(`/template/import?userId=${encodeURIComponent(userId)}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      // responseType: "json" por defecto
    });

    return res;
  }
};