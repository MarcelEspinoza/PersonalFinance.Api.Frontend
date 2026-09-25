import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { commitmentService } from "../../services/commitmentService";

export function CommitmentForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [amount, setAmount] = useState(0);

  const submit = async () => {
    await commitmentService.create({
      name,
      type,
      expectedAmount: amount,
      tolerance: 0,
      startMonth: new Date().toISOString(),
      isActive: true,
    });
    setName("");
    setAmount(0);
    onSaved();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] md:items-end">
      <Input
        placeholder="Nombre"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <select
        aria-label="Tipo"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={type}
        onChange={e => setType(e.target.value === "Income" ? "Income" : "Expense")}
      >
        <option value="Expense">Gasto</option>
        <option value="Income">Ingreso</option>
      </select>
      <Input
        type="number"
        aria-label="Importe"
        value={amount}
        onChange={e => setAmount(Number(e.target.value))}
      />
      <Button type="button" onClick={submit} className="w-full md:w-auto">
        Añadir
      </Button>
    </div>
  );
}