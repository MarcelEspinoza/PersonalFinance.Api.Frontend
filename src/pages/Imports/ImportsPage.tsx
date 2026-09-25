import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";
import type { Account, ImportChatMessage, ImportReview, ImportRow } from "../../types/ledger";

export function ImportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const createAccount = async () => {
    const name = window.prompt("Nombre de la cuenta", "Personal");
    if (!name?.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const created = await LedgerService.createAccount({
        name: name.trim(),
        type: "checking",
        currency: "EUR",
        openingBalance: 0,
        openingDate: "2026-01-01",
      });
      setAccounts((current) => [...current, created]);
      setAccountId(created.id);
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido crear la cuenta."));
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!accountId || !file) {
      setError("Selecciona una cuenta y un CSV.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await LedgerService.createImport(accountId, file);
      setReview(await LedgerService.getImportReview(result.id));
      setMessage(`Lote creado: ${result.acceptedRows} filas para revisar.`);
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido importar el CSV."));
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

  if (loading) {
    return <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar movimientos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El mapping propone primero; las filas restantes se revisan manualmente antes de aplicar.
        </p>
      </div>

      {error && <div className="flex gap-2 rounded-md border border-negative/25 bg-negative-soft p-3 text-sm text-negative"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {message && <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</div>}

      {!review && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-64 space-y-1 text-sm">
              <span className="font-medium">Cuenta</span>
              <select className="h-9 w-full rounded-md border bg-background px-3" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Selecciona una cuenta</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <Button type="button" variant="outline" onClick={() => void createAccount()} disabled={busy}>Nueva cuenta</Button>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-4 text-sm">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span>{file?.name ?? "Seleccionar CSV de Revolut"}</span>
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={onFileChange} />
          </label>
          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={() => void LedgerService.seedImportMappings()} disabled={busy}>Cargar mappings verificados</Button>
            <Button onClick={() => void upload()} disabled={busy || !accountId || !file}>{busy ? "Importando…" : "Importar para revisar"}</Button>
          </div>
        </div>
      )}

      {review && (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">{review.fileName}</h2>
              <p className="text-sm text-muted-foreground">{review.rows.length} filas · estado: {review.status}</p>
            </div>
            <Button onClick={() => void apply()} disabled={busy || review.status === "Applied"}>{busy ? "Aplicando…" : "Aplicar lote"}</Button>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Descripción</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2 text-left">Concepto</th><th className="px-3 py-2 text-left">Origen</th></tr>
              </thead>
              <tbody>
                {review.rows.map((row) => {
                  const selected = row.confirmedConceptId ?? row.suggestedConceptId ?? "";
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="whitespace-nowrap px-3 py-2">{row.valueDate}</td>
                      <td className="max-w-[28rem] px-3 py-2">{row.rawDescription}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right ${row.amount < 0 ? "text-negative" : "text-emerald-700"}`}>{row.amount.toFixed(2)} {row.currency ?? ""}</td>
                      <td className="px-3 py-2">
                        <select className="h-8 min-w-52 rounded-md border bg-background px-2" value={selected} disabled={busy || review.status === "Applied"} onChange={(e) => void updateConcept(row, e.target.value)}>
                          <option value="">Sin concepto (revisar)</option>
                          {review.concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.confirmedConceptId ? "manual" : row.suggestionSource ?? "manual"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex h-[65vh] flex-col rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Asistente</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4">
            {chatMessages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Pídeme cosas como «pon Mercadona en Alimentación» o «¿por qué está sin concepto la fila de Amazon?».
              </p>
            )}
            {chatMessages.map((entry, index) => (
              <div
                key={index}
                className={`rounded-md px-3 py-2 text-sm ${
                  entry.role === "user"
                    ? "ml-6 bg-primary/10 text-foreground"
                    : "mr-6 bg-muted text-foreground"
                }`}
              >
                {entry.content}
              </div>
            ))}
            {chatBusy && (
              <div className="mr-6 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => void sendChat(e)} className="flex gap-2 border-t p-3">
            <input
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
              placeholder="Escribe un mensaje…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatBusy || review.status === "Applied"}
            />
            <Button type="submit" size="icon" disabled={chatBusy || !chatInput.trim() || review.status === "Applied"}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
        </div>
      )}
    </div>
  );
}
