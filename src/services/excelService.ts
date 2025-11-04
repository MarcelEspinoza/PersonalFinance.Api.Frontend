import * as XLSX from "xlsx";

export const excelService = {
  exportTemplate: (mode: "income" | "expense") => {
    const headers = [
      ["description", "amount", "date", "categoryId", "notes", "type"], 
      // type: Fixed | Variable | Temporary
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `${mode}-template.xlsx`);
  },

  importFile: async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    return rows;
  }
};
