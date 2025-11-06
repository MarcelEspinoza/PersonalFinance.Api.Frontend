// utils comunes para ingresos y gastos

export const formatDate = (d?: Date | string | null) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : "";
};


const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const getInitialFormData = () => {
  const today = new Date();
  const start = today;
  const end = addDays(start, 5);

  return {
    description: "",
    amount: "",
    frequency: "monthly",
    start_Date: formatDate(start),
    end_Date: formatDate(end),
    date: formatDate(today),
    notes: "",
    categoryId: 0,
    isIndefinite: false,
    loanId: null,
    userId: "",
  };
};
