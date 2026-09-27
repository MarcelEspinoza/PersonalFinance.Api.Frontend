import { createContext, ReactNode, useContext, useState } from "react";
import { LedgerService, ledgerErrorMessage } from "../services/ledgerService";
import type { ImportBatchResult } from "../types/ledger";

type ImportStatus = "idle" | "preparing" | "uploading" | "processing" | "completed" | "error";

interface ImportProgressState {
  status: ImportStatus;
  uploadPercentage: number;
  fileName: string | null;
  result: ImportBatchResult | null;
  error: string | null;
}

interface ImportProgressContextValue extends ImportProgressState {
  startImport: (accountId: string, file: File) => Promise<ImportBatchResult>;
  clearImport: () => void;
}

const initialState: ImportProgressState = {
  status: "idle",
  uploadPercentage: 0,
  fileName: null,
  result: null,
  error: null,
};

const ImportProgressContext = createContext<ImportProgressContextValue | null>(null);

export function ImportProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImportProgressState>(initialState);

  const startImport = async (accountId: string, file: File) => {
    setState({
      status: "preparing",
      uploadPercentage: 0,
      fileName: file.name,
      result: null,
      error: null,
    });

    try {
      await LedgerService.seedChartOfAccounts();
      await LedgerService.seedImportMappings();
      setState((current) => ({ ...current, status: "uploading" }));

      const result = await LedgerService.createImport(accountId, file, (percentage) => {
        setState((current) => ({
          ...current,
          status: percentage >= 100 ? "processing" : "uploading",
          uploadPercentage: percentage,
        }));
      });
      setState({
        status: "completed",
        uploadPercentage: 100,
        fileName: file.name,
        result,
        error: null,
      });
      return result;
    } catch (error) {
      const message = ledgerErrorMessage(error, "No se ha podido importar el CSV.");
      setState((current) => ({
        ...current,
        status: "error",
        error: message,
      }));
      throw error;
    }
  };

  const clearImport = () => setState(initialState);

  return (
    <ImportProgressContext.Provider value={{ ...state, startImport, clearImport }}>
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  const context = useContext(ImportProgressContext);
  if (!context) throw new Error("useImportProgress debe usarse dentro de ImportProgressProvider.");
  return context;
}
