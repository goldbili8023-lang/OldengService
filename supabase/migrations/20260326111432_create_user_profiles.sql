/*
  # Create user profiles table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, user display name)
      - `role` (text, either 'senior' or 'worker')
      - `suburb` (text, user's suburb for location features)
      - `font_size` (text, accessibility preference: 'normal', 'large', 'xlarge')
      - `high_contrast` (boolean, accessibility preference)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_profiles`
    - Authenticated users can read their own profile
    - Authenticated users can insert their own profile
    - Authenticated users can update their own profile
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'senior' CHECK (role IN ('senior', 'worker')),
  suburb text DEFAULT '',
  font_size text NOT NULL DEFAULT 'normal' CHECK (font_size IN ('normal', 'large', 'xlarge')),
  high_contrast boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
