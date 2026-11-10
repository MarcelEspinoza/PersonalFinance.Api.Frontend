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
import { LedgerService } from "../../services/ledgerService";
import type { Account, ChartGroup, ConceptKind } from "../../types/ledger";

export interface AccountMovementValues {
  accountId: string | null;
  conceptId: string | null;
  amount: number;
  date: string;
}

interface Props {
  open: boolean;
  title: string;
  description?: string;
  defaultAmount: number;
  conceptKinds: ConceptKind[];
  preferredConcept: RegExp;
  noAccountLabel?: string;
  lockAmount?: boolean;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AccountMovementValues) => void;
}

export function AccountMovementDialog({
  open,
  title,
  description,
  defaultAmount,
  conceptKinds,
  preferredConcept,
  noAccountLabel,
  lockAmount = false,
  submitLabel,
  busy,
  error,
  onOpenChange,
  onSubmit,
}: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<ChartGroup[]>([]);
  const [accountId, setAccountId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const kindsKey = conceptKinds.join(",");
  const preferredSource = preferredConcept.source;

  useEffect(() => {
    if (!open) return;
    let active = true;
    const kinds = kindsKey.split(",");
    const preferred = new RegExp(preferredSource, "i");
    setAmount(defaultAmount.toFixed(2));
    setDate(today());
    setLoadError(null);
    Promise.all([LedgerService.getAccounts(), LedgerService.getChartOfAccounts()])
      .then(([accountList, chart]) => {
        if (!active) return;
        const usable = chart.groups
          .filter((group) => group.isActive && kinds.includes(group.kind))
          .map((group) => ({ ...group, concepts: group.concepts.filter((concept) => concept.isActive) }))
          .filter((group) => group.concepts.length > 0);
        const concepts = usable.flatMap((group) => group.concepts);
        setAccounts(accountList);
        setGroups(usable);
        setAccountId((accountList.find((item) => item.type === "cash") ?? accountList[0])?.id ?? "");
        setConceptId((concepts.find((item) => preferred.test(item.name)) ?? concepts[0])?.id ?? "");
      })
      .catch(() => {
        if (active) setLoadError("No he podido cargar tus cuentas y conceptos.");
      });
    return () => {
      active = false;
    };
  }, [open, defaultAmount, kindsKey, preferredSource]);

  const parsedAmount = Number(amount.replace(",", "."));
  const withAccount = accountId !== "";
  const canSubmit =
    !busy && Number.isFinite(parsedAmount) && parsedAmount > 0 && date !== "" && (!withAccount || conceptId !== "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      accountId: withAccount ? accountId : null,
      conceptId: withAccount ? conceptId : null,
      amount: parsedAmount,
      date,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border bg-card p-6 shadow-xl sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="movement-account">¿En qué cuenta?</Label>
              <select
                id="movement-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-3 text-sm"
              >
                {noAccountLabel && <option value="">{noAccountLabel}</option>}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {withAccount && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="movement-concept">Concepto</Label>
                  <select
                    id="movement-concept"
                    value={conceptId}
                    onChange={(e) => setConceptId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-card px-3 text-sm"
                  >
                    {groups.map((group) => (
                      <optgroup key={group.id} label={group.name}>
                        {group.concepts.map((concept) => (
                          <option key={concept.id} value={concept.id}>
                            {concept.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="movement-amount">Importe</Label>
                    <Input
                      id="movement-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      value={amount}
                      disabled={lockAmount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="movement-date">Día</Label>
                    <Input id="movement-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {(error || loadError) && (
              <p className="rounded-lg border border-negative/25 bg-negative-soft p-3 text-sm text-negative">
                {error ?? loadError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Guardando…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
