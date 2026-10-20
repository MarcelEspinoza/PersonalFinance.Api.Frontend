import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { LedgerService } from "../../services/ledgerService";
import { Account } from "../../types/ledger";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type BankRow = Account & { openingBalanceText: string };

function toRow(account: Account): BankRow {
  return { ...account, openingBalanceText: String(account.openingBalance ?? 0) };
}

export default function BanksManager() {
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [name, setName] = useState("");
  const [entity, setEntity] = useState("");
  const [color, setColor] = useState("#00A86B");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await LedgerService.getAccounts(true);
      setBanks(Array.isArray(data) ? data.map(toRow) : []);
    } catch (err) {
      console.error("Error loading accounts", err);
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) {
      alert("Introduce el nombre de la cuenta");
      return;
    }
    setCreating(true);
    try {
      await LedgerService.createAccount({
        name: name.trim(),
        type: "checking",
        currency: "EUR",
        openingBalance: 0,
        openingDate: today(),
        entity: entity.trim() || undefined,
        color,
      });
      setName("");
      setEntity("");
      setColor("#00A86B");
      await load();
    } catch (err) {
      console.error("Error creating account", err);
      alert("No se pudo crear la cuenta");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: string) {
    const current = banks.find((x) => x.id === id);
    if (!current) return;
    const openingBalance = Number(current.openingBalanceText.replace(",", "."));
    if (current.openingBalanceText.trim() === "" || !Number.isFinite(openingBalance)) {
      alert("El saldo inicial no es válido");
      return;
    }
    if (!current.openingDate) {
      alert("Indica la fecha del saldo inicial");
      return;
    }
    setSavingId(id);
    try {
      await LedgerService.updateAccount(id, {
        name: current.name,
        type: current.type,
        currency: current.currency,
        entity: current.entity ?? undefined,
        accountNumber: current.accountNumber ?? undefined,
        color: current.color ?? undefined,
        isActive: current.isActive,
        openingBalance,
        openingDate: current.openingDate,
      });
      await load();
    } catch (err) {
      console.error("Error updating account", err);
      alert("No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(id: string) {
    const current = banks.find((account) => account.id === id);
    if (!current) return;
    if (current.isActive && !confirm(`¿Deshabilitar "${current.name}"? Dejará de aparecer al crear o importar movimientos.`)) return;

    setSavingId(id);
    try {
      await LedgerService.updateAccount(id, {
        name: current.name,
        type: current.type,
        currency: current.currency,
        entity: current.entity ?? undefined,
        accountNumber: current.accountNumber ?? undefined,
        color: current.color ?? undefined,
        isActive: !current.isActive,
      });
      await load();
    } catch (err) {
      console.error("Error changing account status", err);
      alert("No se pudo cambiar el estado de la cuenta");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card data-tour="accounts-new" className="shadow-none">
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Nombre banco</Label>
              <Input
                id="bank-name"
                placeholder="Nombre banco"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-entity">Entidad</Label>
              <Input
                id="bank-entity"
                placeholder="Entidad"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <Label htmlFor="bank-color" className="sr-only">Color banco</Label>
                <input
                  id="bank-color"
                  aria-label="Color banco"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="block h-9 w-11 cursor-pointer rounded-md border bg-background p-1"
                />
              </div>
              <Button onClick={handleAdd} disabled={creating}>
                {creating ? "Creando..." : "Agregar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading && <p className="py-4 text-sm text-muted-foreground">Cargando bancos...</p>}
        {!loading && banks.length === 0 && <p className="py-4 text-sm text-muted-foreground">No hay bancos registrados.</p>}

        {banks.map((b) => (
          <Card key={b.id} data-tour="accounts-card" className={`shadow-none ${b.isActive ? "" : "bg-muted/40 opacity-75"}`}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div style={{ backgroundColor: b.color ?? "#CBD5E1" }} className="h-10 w-10 shrink-0 rounded-lg border" />
                <div className="min-w-0 space-y-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${b.isActive ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground"}`}>
                    {b.isActive ? "Activa" : "Deshabilitada"}
                  </span>
                  <Input
                    aria-label={`Nombre para ${b.name}`}
                    className="h-7 border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
                    value={b.name}
                    onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))}
                  />
                  <Input
                    aria-label={`Entidad para ${b.name}`}
                    className="h-6 border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                    value={b.entity ?? ""}
                    onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, entity: e.target.value } : x)))}
                  />
                  <div data-tour="accounts-opening" className="flex flex-wrap items-center gap-2 pt-1">
                    <Label htmlFor={`opening-balance-${b.id}`} className="text-xs font-normal text-muted-foreground">
                      Saldo inicial
                    </Label>
                    <Input
                      id={`opening-balance-${b.id}`}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      title="Dinero que tenía la cuenta al empezar ese día"
                      className="h-8 w-28"
                      value={b.openingBalanceText}
                      onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, openingBalanceText: e.target.value } : x)))}
                    />
                    <Label htmlFor={`opening-date-${b.id}`} className="text-xs font-normal text-muted-foreground">
                      desde
                    </Label>
                    <Input
                      id={`opening-date-${b.id}`}
                      type="date"
                      className="h-8 w-36"
                      value={b.openingDate}
                      onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, openingDate: e.target.value } : x)))}
                    />
                  </div>
                </div>
              </div>

              <div data-tour="accounts-actions" className="flex items-center gap-2 self-end sm:self-auto">
                <input
                  aria-label={`Color para ${b.name}`}
                  type="color"
                  value={b.color ?? "#00A86B"}
                  onChange={(e) => setBanks((prev) => prev.map((x) => (x.id === b.id ? { ...x, color: e.target.value } : x)))}
                  className="h-9 w-11 cursor-pointer rounded-md border bg-background p-1"
                />
                <Button onClick={() => handleSave(b.id)} size="sm" disabled={savingId === b.id}>
                  {savingId === b.id ? "Guardando..." : "Guardar"}
                </Button>
                <Button onClick={() => handleToggleActive(b.id)} variant="outline" size="sm" disabled={savingId === b.id}>
                  {b.isActive ? "Deshabilitar" : "Activar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
