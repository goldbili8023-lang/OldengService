/*
  # Create medications and medication logs tables

  1. New Tables
    - `medications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `medicine_name` (text)
      - `dosage` (text)
      - `reminder_time` (time)
      - `frequency` (text: 'daily', 'twice_daily', 'weekly')
      - `notes` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `medication_logs`
      - `id` (uuid, primary key)
      - `medication_id` (uuid, references medications)
      - `user_id` (uuid, references auth.users)
      - `taken_date` (date)
      - `taken_time` (timestamptz)
      - `status` (text: 'taken', 'missed', 'skipped')

  2. Security
    - Enable RLS on both tables
    - Users can CRUD their own medications and logs
*/

CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text NOT NULL DEFAULT '',
  reminder_time time NOT NULL DEFAULT '08:00',
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'twice_daily', 'weekly')),
  notes text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own medications"
  ON medications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications"
  ON medications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_date date NOT NULL DEFAULT CURRENT_DATE,
  taken_time timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'taken' CHECK (status IN ('taken', 'missed', 'skipped'))
);

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own medication logs"
  ON medication_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medication logs"
  ON medication_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication logs"
  ON medication_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
