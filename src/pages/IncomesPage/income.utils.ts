const formatDate = (d: Date) => d.toISOString().split("T")[0];

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
    name: "",
    amount: "",
    frequency: "monthly",
    start_date: formatDate(start),
    end_date: formatDate(end),            
    date: formatDate(today),             
    notes: "",
    categoryId: 0,                      
    isIndefinite: false,
  };
};