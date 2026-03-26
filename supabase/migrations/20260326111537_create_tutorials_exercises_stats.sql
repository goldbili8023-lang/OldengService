/*
  # Create tutorials, exercise resources, and area statistics tables

  1. New Tables
    - `tutorials`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `media_url` (text)
      - `feature_name` (text)
      - `sort_order` (integer)

    - `exercise_resources`
      - `id` (uuid, primary key)
      - `title` (text)
      - `category` (text)
      - `description` (text)
      - `video_url` (text)
      - `safety_note` (text)
      - `duration` (text)

    - `area_statistics`
      - `id` (uuid, primary key)
      - `area_name` (text)
      - `elderly_population` (integer)
      - `service_count` (integer)
      - `support_gap_score` (double precision)
      - `latitude` (double precision)
      - `longitude` (double precision)

  2. Security
    - Enable RLS on all tables
    - All authenticated users can read all three tables
    - Workers can manage area_statistics
*/

CREATE TABLE IF NOT EXISTS tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  media_url text DEFAULT '',
  feature_name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view tutorials"
  ON tutorials FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS exercise_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  video_url text DEFAULT '',
  safety_note text DEFAULT '',
  duration text DEFAULT ''
);

ALTER TABLE exercise_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view exercises"
  ON exercise_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS area_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name text NOT NULL,
  elderly_population integer NOT NULL DEFAULT 0,
  service_count integer NOT NULL DEFAULT 0,
  support_gap_score double precision NOT NULL DEFAULT 0,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0
);

ALTER TABLE area_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view area stats"
  ON area_statistics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can insert area stats"
  ON area_statistics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );

CREATE POLICY "Workers can update area stats"
  ON area_statistics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );
