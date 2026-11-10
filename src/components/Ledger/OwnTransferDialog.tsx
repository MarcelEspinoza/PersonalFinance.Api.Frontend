import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { today } from "../../utils/civilDate";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";
import { ConceptKind, type Account, type ChartConcept } from "../../types/ledger";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function OwnTransferDialog({ open, onOpenChange, onDone }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [concepts, setConcepts] = useState<ChartConcept[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [sourceOnly, setSourceOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setAmount("");
    setDate(today());
    setDescription("");
    setSourceOnly(false);
    setError(null);
    Promise.all([LedgerService.getAccounts(), LedgerService.getChartOfAccounts()])
      .then(([accountList, chart]) => {
        if (!active) return;
        const transferConcepts = chart.groups
          .filter((group) => group.isActive && group.kind === ConceptKind.Transfer)
          .flatMap((group) => group.concepts.filter((concept) => concept.isActive));
        const cash = accountList.find((item) => item.type === "cash");
        const from = cash ?? accountList[0];
        const to = accountList.find((item) => item.id !== from?.id && item.type === "checking")
          ?? accountList.find((item) => item.id !== from?.id);
        setAccounts(accountList);
        setConcepts(transferConcepts);
        setFromId(from?.id ?? "");
        setToId(to?.id ?? "");
        setConceptId(
          (transferConcepts.find((item) => /entre mis bancos/i.test(item.name)) ?? transferConcepts[0])?.id ?? "",
        );
      })
      .catch(() => {
        if (active) setError("No he podido cargar tus cuentas.");
      });
    return () => {
      active = false;
    };
  }, [open]);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit =
    !busy && fromId !== "" && toId !== "" && fromId !== toId && conceptId !== "" &&
    Number.isFinite(parsedAmount) && parsedAmount > 0 && date !== "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await LedgerService.createOwnTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        conceptId,
        amount: parsedAmount,
        date,
        description: description.trim() || null,
        sourceOnly,
      });
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se pudo guardar el traspaso."));
    } finally {
      setBusy(false);
    }
  };

  const accountSelect = (id: string, value: string, onChange: (value: string) => void) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-card px-3 text-sm"
    >
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border bg-card p-6 shadow-xl sm:max-w-md">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Pasar dinero entre mis cuentas</DialogTitle>
            <DialogDescription>
              Por ejemplo, efectivo que ingresas en el banco. Baja en una cuenta, sube en la otra y no cuenta como gasto ni ingreso.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="transfer-from">Sale de</Label>
                {accountSelect("transfer-from", fromId, setFromId)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transfer-to">Entra en</Label>
                {accountSelect("transfer-to", toId, setToId)}
              </div>
            </div>
            {fromId !== "" && fromId === toId && (
              <p className="text-xs text-negative">Elige dos cuentas distintas.</p>
            )}
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={sourceOnly}
                onChange={(e) => setSourceOnly(e.target.checked)}
              />
              <span>
                La entrada ya vino con el extracto del banco. Así solo se resta de «Sale de» y no se cuenta dos veces.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="transfer-amount">Importe</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transfer-date">Día</Label>
                <Input id="transfer-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-concept">Concepto</Label>
              <select
                id="transfer-concept"
                value={conceptId}
                onChange={(e) => setConceptId(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-3 text-sm"
              >
                {concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-description">Nota (opcional)</Label>
              <Input
                id="transfer-description"
                value={description}
                maxLength={300}
                placeholder="Ej.: efectivo que mamá ingresó en el banco"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-negative/25 bg-negative-soft p-3 text-sm text-negative">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Guardando…" : "Traspasar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
