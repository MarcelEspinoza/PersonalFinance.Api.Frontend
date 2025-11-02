/*
  # Personal Finance Application Schema

  ## Overview
  Complete database schema for personal finance management application with user authentication,
  income/expense tracking, loans management, and Pasanaco feature.

  ## Tables Created

  ### 1. profiles
  Extended user profile information linked to auth.users
  - id (uuid, references auth.users)
  - full_name (text)
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ### 2. fixed_incomes
  Regular recurring income (salary, rent income, etc.)
  - id (uuid)
  - user_id (uuid, references profiles)
  - name (text) - e.g., "Monthly Salary"
  - amount (decimal)
  - frequency (text) - monthly, weekly, etc.
  - start_date (date)
  - end_date (date, nullable)
  - is_active (boolean)
  - created_at (timestamptz)

  ### 3. variable_incomes
  One-time or irregular income
  - id (uuid)
  - user_id (uuid)
  - name (text) - e.g., "Commission", "Bonus"
  - amount (decimal)
  - date (date)
  - category (text) - sales, commission, extras, etc.
  - notes (text, nullable)
  - created_at (timestamptz)

  ### 4. fixed_expenses
  Regular recurring expenses
  - id (uuid)
  - user_id (uuid)
  - name (text)
  - amount (decimal)
  - category (text) - housing, insurance, food, pet, loans, bills, rent
  - frequency (text)
  - due_date (integer) - day of month
  - is_active (boolean)
  - created_at (timestamptz)

  ### 5. variable_expenses
  One-time or irregular expenses
  - id (uuid)
  - user_id (uuid)
  - name (text)
  - amount (decimal)
  - date (date)
  - category (text) - leisure, shopping, travel, etc.
  - notes (text, nullable)
  - created_at (timestamptz)

  ### 6. temporary_movements
  Movements that last several months but have an end date
  - id (uuid)
  - user_id (uuid)
  - name (text)
  - amount (decimal)
  - type (text) - income or expense
  - start_date (date)
  - end_date (date)
  - is_active (boolean)
  - created_at (timestamptz)

  ### 7. loans
  All types of loans (given, received, bank loans)
  - id (uuid)
  - user_id (uuid)
  - type (text) - given, received, bank
  - name (text) - lender/borrower name or bank name
  - principal_amount (decimal)
  - outstanding_amount (decimal)
  - interest_rate (decimal, default 0)
  - start_date (date)
  - due_date (date, nullable)
  - status (text) - active, paid, overdue
  - created_at (timestamptz)

  ### 8. loan_payments
  Track individual loan payments
  - id (uuid)
  - loan_id (uuid, references loans)
  - amount (decimal)
  - payment_date (date)
  - notes (text, nullable)
  - created_at (timestamptz)

  ### 9. pasanaco
  Pasanaco group information
  - id (uuid)
  - user_id (uuid) - creator/administrator
  - name (text)
  - monthly_amount (decimal, default 200)
  - total_participants (integer, default 11)
  - current_round (integer, default 1)
  - is_active (boolean, default true)
  - created_at (timestamptz)

  ### 10. pasanaco_participants
  Participants in a Pasanaco
  - id (uuid)
  - pasanaco_id (uuid, references pasanaco)
  - name (text)
  - position (integer) - order in the rotation
  - has_received (boolean, default false)
  - received_date (date, nullable)
  - created_at (timestamptz)

  ### 11. pasanaco_payments
  Monthly payments tracking
  - id (uuid)
  - pasanaco_id (uuid, references pasanaco)
  - participant_id (uuid, references pasanaco_participants)
  - month (date)
  - amount (decimal)
  - paid (boolean, default false)
  - paid_date (date, nullable)
  - created_at (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Authenticated users only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create fixed_incomes table
CREATE TABLE IF NOT EXISTS fixed_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(10,2) NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed incomes"
  ON fixed_incomes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed incomes"
  ON fixed_incomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed incomes"
  ON fixed_incomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed incomes"
  ON fixed_incomes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create variable_incomes table
CREATE TABLE IF NOT EXISTS variable_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(10,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE variable_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variable incomes"
  ON variable_incomes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variable incomes"
  ON variable_incomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variable incomes"
  ON variable_incomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own variable incomes"
  ON variable_incomes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create fixed_expenses table
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(10,2) NOT NULL,
  category text NOT NULL DEFAULT 'other',
  frequency text NOT NULL DEFAULT 'monthly',
  due_date integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed expenses"
  ON fixed_expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed expenses"
  ON fixed_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed expenses"
  ON fixed_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed expenses"
  ON fixed_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create variable_expenses table
CREATE TABLE IF NOT EXISTS variable_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(10,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE variable_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variable expenses"
  ON variable_expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variable expenses"
  ON variable_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variable expenses"
  ON variable_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own variable expenses"
  ON variable_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create temporary_movements table
CREATE TABLE IF NOT EXISTS temporary_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temporary_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own temporary movements"
  ON temporary_movements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own temporary movements"
  ON temporary_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own temporary movements"
  ON temporary_movements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own temporary movements"
  ON temporary_movements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('given', 'received', 'bank')),
  name text NOT NULL,
  principal_amount decimal(10,2) NOT NULL,
  outstanding_amount decimal(10,2) NOT NULL,
  interest_rate decimal(5,2) DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments for own loans"
  ON loan_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own loans"
  ON loan_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments for own loans"
  ON loan_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments for own loans"
  ON loan_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

-- Create pasanaco table
CREATE TABLE IF NOT EXISTS pasanaco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_amount decimal(10,2) DEFAULT 200,
  total_participants integer DEFAULT 11,
  current_round integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pasanaco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pasanaco"
  ON pasanaco FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pasanaco"
  ON pasanaco FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pasanaco"
  ON pasanaco FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pasanaco"
  ON pasanaco FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create pasanaco_participants table
CREATE TABLE IF NOT EXISTS pasanaco_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pasanaco_id uuid NOT NULL REFERENCES pasanaco(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  has_received boolean DEFAULT false,
  received_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pasanaco_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants of own pasanaco"
  ON pasanaco_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_participants.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert participants in own pasanaco"
  ON pasanaco_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_participants.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update participants in own pasanaco"
  ON pasanaco_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_participants.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_participants.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete participants from own pasanaco"
  ON pasanaco_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_participants.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

-- Create pasanaco_payments table
CREATE TABLE IF NOT EXISTS pasanaco_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pasanaco_id uuid NOT NULL REFERENCES pasanaco(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES pasanaco_participants(id) ON DELETE CASCADE,
  month date NOT NULL,
  amount decimal(10,2) NOT NULL,
  paid boolean DEFAULT false,
  paid_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pasanaco_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments for own pasanaco"
  ON pasanaco_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_payments.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own pasanaco"
  ON pasanaco_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_payments.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments for own pasanaco"
  ON pasanaco_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_payments.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_payments.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments from own pasanaco"
  ON pasanaco_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pasanaco
      WHERE pasanaco.id = pasanaco_payments.pasanaco_id
      AND pasanaco.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fixed_incomes_user_id ON fixed_incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_incomes_user_id ON variable_incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_incomes_date ON variable_incomes(date);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_expenses_user_id ON variable_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_expenses_date ON variable_expenses(date);
CREATE INDEX IF NOT EXISTS idx_temporary_movements_user_id ON temporary_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_pasanaco_user_id ON pasanaco(user_id);
CREATE INDEX IF NOT EXISTS idx_pasanaco_participants_pasanaco_id ON pasanaco_participants(pasanaco_id);
CREATE INDEX IF NOT EXISTS idx_pasanaco_payments_pasanaco_id ON pasanaco_payments(pasanaco_id);
