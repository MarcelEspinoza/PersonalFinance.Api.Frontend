import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSearch, FileSpreadsheet, Layers3, List, Loader2, MessageCircle, Send, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";
import type { Account, ImportChatMessage, ImportReview, ImportRow } from "../../types/ledger";
import { TransactionTransferCenter } from "../../components/TransactionImportExport/TransactionTransferCenter";
import { useImportProgress } from "../../contexts/ImportProgressContext";

const conceptKindLabel = (kind: string) => {
  if (kind.toLowerCase() === "income") return "Ingreso";
  if (kind.toLowerCase() === "transfer") return "Traspaso";
  return "Gasto";
};

export function ImportsPage() {
  const importProgress = useImportProgress();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEntity, setNewAccountEntity] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [activeFlow, setActiveFlow] = useState<"revolut" | "templates">("revolut");
  const [reviewMode, setReviewMode] = useState<"groups" | "unassigned" | "rows">("groups");
  const [showImportAssistant, setShowImportAssistant] = useState(false);
  const importWorking =
    importProgress.status === "preparing" ||
    importProgress.status === "uploading" ||
    importProgress.status === "processing";

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const loaded = await LedgerService.getAccounts();
      setAccounts(loaded);
      setAccountId((current) => current || loaded[0]?.id || "");
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se han podido cargar las cuentas."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (importProgress.status !== "completed" || !importProgress.result || review) return;

    let active = true;
    void LedgerService.getImportReview(importProgress.result.id)
      .then((loadedReview) => {
        if (!active) return;
        setReview(loadedReview);
        setMessage(`Lote creado: ${importProgress.result?.acceptedRows ?? 0} filas para revisar.`);
      })
      .catch((err) => {
        if (active) setError(ledgerErrorMessage(err, "No se ha podido cargar el lote importado."));
      });
    return () => {
      active = false;
    };
  }, [importProgress.status, importProgress.result, review]);

  const openNewAccount = () => {
    setNewAccountName("");
    setNewAccountEntity("");
    setShowNewAccount(true);
  };

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    const name = newAccountName.trim();
    if (!name) return;

    setCreatingAccount(true);
    setError(null);
    try {
      const created = await LedgerService.createAccount({
        name,
        type: "checking",
        currency: "EUR",
        openingBalance: 0,
        openingDate: new Date().toISOString().slice(0, 10),
        entity: newAccountEntity.trim() || undefined,
      });
      setAccounts((current) => [...current, created]);
      setAccountId(created.id);
      setShowNewAccount(false);
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido crear la cuenta."));
    } finally {
      setCreatingAccount(false);
    }
  };


  const upload = async () => {
    if (!accountId || !file) {
      setError("Selecciona una cuenta y un CSV.");
      return;
    }

    setError(null);
    setMessage(null);
    try {
      const result = await importProgress.startImport(accountId, file);
      setReview(await LedgerService.getImportReview(result.id));
      setMessage(`Lote creado: ${result.acceptedRows} filas para revisar.`);
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido importar el CSV."));
    }
  };

  const prepareCategoriesAndRules = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const chart = await LedgerService.seedChartOfAccounts();
      const mappings = await LedgerService.seedImportMappings();
      setMessage(
        `Categorías preparadas: ${chart.conceptsCreated} nuevas; ${mappings.created} reglas añadidas y ${mappings.updated} actualizadas.`,
      );
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se han podido preparar las categorías y reglas."));
    } finally {
      setBusy(false);
    }
  };

  const updateConcept = async (row: ImportRow, conceptId: string) => {
    if (!review) return;
    setBusy(true);
    setError(null);
    try {
      await LedgerService.selectImportConcept(review.id, row.id, conceptId || null);
      setReview(await LedgerService.getImportReview(review.id));
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido guardar el concepto."));
    } finally {
      setBusy(false);
    }
  };

  const updateGroupConcept = async (normalizedDescription: string, conceptId: string) => {
    if (!review) return;
    setBusy(true);
    setError(null);
    try {
      await LedgerService.selectImportGroupConcept(
        review.id,
        normalizedDescription,
        conceptId || null,
      );
      setReview(await LedgerService.getImportReview(review.id));
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido clasificar el grupo."));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!review) return;
    if (!window.confirm("¿Aplicar las filas con concepto al libro contable?")) return;

    setBusy(true);
    setError(null);
    try {
      const result = await LedgerService.applyImport(review.id);
      setMessage(`Importación aplicada: ${result.applied} asientos.`);
      setReview(await LedgerService.getImportReview(review.id));
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido aplicar el lote."));
    } finally {
      setBusy(false);
    }
  };

  const suggestPending = async () => {
    if (!review) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await LedgerService.seedChartOfAccounts();
      await LedgerService.seedImportMappings();
      const result = await LedgerService.suggestImport(review.id);
      setReview(await LedgerService.getImportReview(review.id));
      setReviewMode(result.remaining > 0 ? "unassigned" : "groups");
      setMessage(
        `Clasificación automática: ${result.mapped} por reglas específicas, ${result.suggested} por IA, ${result.fallback} por reglas generales y ${result.remaining} pendientes.${result.aiWarning ? ` IA: ${result.aiWarning}` : ""}`,
      );
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido completar la clasificación automática."));
    } finally {
      setBusy(false);
    }
  };

  const resetImport = () => {
    setReview(null);
    setFile(null);
    setChatMessages([]);
    setChatInput("");
    setReviewMode("groups");
    importProgress.clearImport();
    setMessage(null);
    setError(null);
  };

  const discardImport = async () => {
    if (!review) return;
    if (review.status === "Applied") {
      resetImport();
      return;
    }
    if (!window.confirm(`¿Cancelar la importación de "${review.fileName}"? Solo se eliminará este lote sin aplicar.`)) return;

    setBusy(true);
    setError(null);
    try {
      await LedgerService.discardImport(review.id);
      resetImport();
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido cancelar esta importación."));
    } finally {
      setBusy(false);
    }
  };

  const [chatMessages, setChatMessages] = useState<ImportChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !review) return;

    const history = chatMessages;
    setChatMessages((current) => [...current, { role: "user", content: text }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const result = await LedgerService.chatImport(review.id, text, history);
      setChatMessages((current) => [...current, { role: "assistant", content: result.reply }]);
      if (result.appliedChanges > 0) {
        setReview(await LedgerService.getImportReview(review.id));
      }
    } catch (err) {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: ledgerErrorMessage(err, "No he podido responder ahora mismo.") },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const importGroups = useMemo(() => {
    if (!review) return [];
    const grouped = new Map<string, ImportRow[]>();
    review.rows.forEach((row) => {
      const key = row.normalizedDescription?.trim() || row.rawDescription.trim();
      const current = grouped.get(key) ?? [];
      current.push(row);
      grouped.set(key, current);
    });

    return Array.from(grouped, ([normalizedDescription, rows]) => {
      const selectedIds = new Set(
        rows
          .map((row) => row.confirmedConceptId ?? row.suggestedConceptId ?? "")
          .filter(Boolean),
      );
      return {
        normalizedDescription,
        rows,
        count: rows.length,
        total: rows.reduce((sum, row) => sum + row.amount, 0),
        selectedConceptId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : "",
        suggestionSource: rows.find((row) => row.confirmedConceptId || row.suggestedConceptId)?.suggestionSource,
      };
    }).sort((a, b) => b.count - a.count || Math.abs(b.total) - Math.abs(a.total));
  }, [review]);

  const unassignedRows = useMemo(
    () => review?.rows.filter((row) => !(row.confirmedConceptId ?? row.suggestedConceptId)) ?? [],
    [review],
  );

  if (loading) {
    return <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar / Exportar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un único lugar para traer movimientos, revisar extractos y descargar tus datos.
        </p>
      </div>

      {error && <div className="flex gap-2 rounded-md border border-negative/25 bg-negative-soft p-3 text-sm text-negative"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {message && <div className="flex gap-2 rounded-md border border-positive/25 bg-positive-soft p-3 text-sm text-positive"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</div>}

      {!review && (
        <div className="inline-flex rounded-lg border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveFlow("revolut")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeFlow === "revolut" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileSearch className="h-4 w-4" /> Extracto Revolut
          </button>
          <button
            type="button"
            onClick={() => setActiveFlow("templates")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeFlow === "templates" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileSpreadsheet className="h-4 w-4" /> Plantillas y exportación
          </button>
        </div>
      )}

      {!review && activeFlow === "templates" && <TransactionTransferCenter />}

      {!review && activeFlow === "revolut" && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Importar extracto de Revolut</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Las reglas y la IA clasifican en bloque; tú revisas solo los comercios dudosos.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-64 space-y-1 text-sm">
              <span className="font-medium">Cuenta</span>
              <select className="h-9 w-full rounded-md border bg-background px-3" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Selecciona una cuenta</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <Button type="button" variant="outline" onClick={openNewAccount} disabled={busy || importWorking}>Nueva cuenta</Button>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-4 text-sm">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span>{file?.name ?? "Seleccionar CSV de Revolut"}</span>
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={onFileChange} />
          </label>
          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={() => void prepareCategoriesAndRules()} disabled={busy || importWorking}>Actualizar categorías y reglas</Button>
            <Button onClick={() => void upload()} disabled={busy || importWorking || !accountId || !file}>
              {importProgress.status === "preparing"
                ? "Preparando…"
                : importProgress.status === "uploading"
                ? `Subiendo ${importProgress.uploadPercentage}%`
                : importProgress.status === "processing"
                  ? "Analizando…"
                  : "Importar para revisar"}
            </Button>
          </div>
        </div>
      )}

      {review && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">{review.fileName}</h2>
              <p className="text-sm text-muted-foreground">{review.rows.length} filas · estado: {review.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setShowImportAssistant(true)} disabled={review.rows.length === 0}>
                <MessageCircle className="h-4 w-4" /> Asistente
              </Button>
              <Button type="button" variant="outline" onClick={() => void discardImport()} disabled={busy}>
                {review.status === "Applied" ? "Nueva importación" : "Cancelar y elegir otro"}
              </Button>
              {review.status !== "Applied" && (
                <Button type="button" variant="outline" onClick={() => void suggestPending()} disabled={busy || review.rows.length === 0}>
                  Clasificar automáticamente
                </Button>
              )}
              <Button onClick={() => void apply()} disabled={busy || review.status === "Applied" || review.rows.length === 0}>{busy ? "Aplicando…" : "Aplicar lote"}</Button>
            </div>
          </div>
          {review.rows.length === 0 && (
            <div className="border-b bg-warning-soft px-4 py-3 text-sm text-warning">
              Este lote está vacío. Pulsa <strong>Cancelar y elegir otro</strong> y vuelve a importar el CSV.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
            <div className="flex rounded-lg border bg-card p-1">
              <button
                type="button"
                onClick={() => setReviewMode("groups")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${reviewMode === "groups" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Layers3 className="h-3.5 w-3.5" /> Comercios ({importGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewMode("unassigned")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${reviewMode === "unassigned" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Sin clasificar ({unassignedRows.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewMode("rows")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${reviewMode === "rows" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <List className="h-3.5 w-3.5" /> Todas ({review.rows.length})
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clasifica un comercio una vez para actualizar todas sus apariciones.
            </p>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            {reviewMode === "groups" ? (
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="w-[38%] px-4 py-3 text-left">Comercio / descripción</th>
                    <th className="w-[7%] px-3 py-3 text-right">Mov.</th>
                    <th className="w-[13%] px-3 py-3 text-right">Neto</th>
                    <th className="w-[32%] px-3 py-3 text-left">Concepto para el grupo</th>
                    <th className="w-[10%] px-3 py-3 text-left">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {importGroups.map((group) => (
                    <tr key={group.normalizedDescription} className="border-t">
                      <td className="px-4 py-3">
                        <div className="break-words font-medium leading-snug">{group.rows[0]?.rawDescription}</div>
                        {group.count > 1 && <div className="mt-1 truncate text-xs text-muted-foreground">{group.normalizedDescription}</div>}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{group.count}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right ${group.total < 0 ? "text-negative" : "text-positive"}`}>{group.total.toFixed(2)} EUR</td>
                      <td className="px-3 py-2">
                        <select className="h-9 w-full rounded-md border bg-background px-2" value={group.selectedConceptId} disabled={busy || review.status === "Applied"} onChange={(e) => void updateGroupConcept(group.normalizedDescription, e.target.value)}>
                          <option value="">Sin concepto (revisar)</option>
                          {review.concepts.map((concept) => <option key={concept.id} value={concept.id}>{conceptKindLabel(concept.kind)} · {concept.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{group.suggestionSource ?? "manual"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Descripción</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2 text-left">Concepto</th><th className="px-3 py-2 text-left">Origen</th></tr>
                </thead>
                <tbody>
                  {(reviewMode === "unassigned" ? unassignedRows : review.rows).map((row) => {
                    const selected = row.confirmedConceptId ?? row.suggestedConceptId ?? "";
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="whitespace-nowrap px-3 py-2">{row.valueDate}</td>
                        <td className="max-w-[28rem] px-3 py-2">{row.rawDescription}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right ${row.amount < 0 ? "text-negative" : "text-positive"}`}>{row.amount.toFixed(2)} {row.currency ?? ""}</td>
                        <td className="px-3 py-2">
                          <select className="h-8 min-w-52 rounded-md border bg-background px-2" value={selected} disabled={busy || review.status === "Applied"} onChange={(e) => void updateConcept(row, e.target.value)}>
                            <option value="">Sin concepto (revisar)</option>
                            {review.concepts.map((concept) => <option key={concept.id} value={concept.id}>{conceptKindLabel(concept.kind)} · {concept.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.confirmedConceptId ? "manual" : row.suggestionSource ?? "manual"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Dialog open={showImportAssistant} onOpenChange={setShowImportAssistant}>
        <DialogContent className="flex h-[75vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b p-5">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" /> Asistente de importación
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-auto p-5">
            {chatMessages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Pídeme cosas como «pon Mercadona en Alimentación» o «¿por qué está sin concepto la fila de Amazon?».
              </p>
            )}
            {chatMessages.map((entry, index) => (
              <div
                key={index}
                className={`rounded-lg px-3 py-2 text-sm ${
                  entry.role === "user"
                    ? "ml-12 bg-primary/10 text-foreground"
                    : "mr-12 bg-muted text-foreground"
                }`}
              >
                {entry.content}
              </div>
            ))}
            {chatBusy && (
              <div className="mr-12 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => void sendChat(e)} className="flex gap-2 border-t p-4">
            <input
              className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
              placeholder="Escribe un mensaje…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatBusy || review?.status === "Applied"}
            />
            <Button type="submit" size="icon" disabled={chatBusy || !chatInput.trim() || review?.status === "Applied"}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void createAccount(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-account-name">Nombre</Label>
              <Input
                id="new-account-name"
                placeholder="Ej. Cuenta nómina"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-account-entity">Entidad (opcional)</Label>
              <Input
                id="new-account-entity"
                placeholder="Ej. BBVA"
                value={newAccountEntity}
                onChange={(e) => setNewAccountEntity(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewAccount(false)}>Cancelar</Button>
              <Button type="submit" disabled={creatingAccount || !newAccountName.trim()}>
                {creatingAccount ? "Creando…" : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
