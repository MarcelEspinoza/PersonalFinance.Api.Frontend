import { useState } from "react";
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
    <div className="flex gap-3 items-end">
      <input
        className="border rounded px-2 py-1"
        placeholder="Nombre"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <select
        className="border rounded px-2 py-1"
        value={type}
        onChange={e => setType(e.target.value as any)}
      >
        <option value="Expense">Gasto</option>
        <option value="Income">Ingreso</option>
      </select>
      <input
        type="number"
        className="border rounded px-2 py-1"
        value={amount}
        onChange={e => setAmount(Number(e.target.value))}
      />
      <button
        onClick={submit}
        className="bg-emerald-600 text-white px-4 py-1 rounded"
      >
        Añadir
      </button>
    </div>
  );
}
