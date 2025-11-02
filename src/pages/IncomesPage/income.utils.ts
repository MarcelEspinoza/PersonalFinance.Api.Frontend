export const getInitialFormData = () => ({
  name: '',
  amount: '',
  frequency: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  date: new Date().toISOString().split('T')[0],
  category: 'salary',
  notes: '',
});
