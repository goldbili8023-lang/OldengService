/*
  # Create service locations, tags, and junction table

  1. New Tables
    - `service_locations`
      - `id` (uuid, primary key)
      - `service_name` (text)
      - `category` (text)
      - `address` (text)
      - `suburb` (text)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `opening_hours` (text)
      - `capacity_status` (text: 'available', 'limited', 'full')
      - `current_status` (text: 'open', 'closed', 'limited')
      - `description` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `service_tags`
      - `id` (uuid, primary key)
      - `tag_name` (text, unique)

    - `location_tags`
      - `id` (uuid, primary key)
      - `location_id` (uuid, references service_locations)
      - `tag_id` (uuid, references service_tags)

  2. Security
    - Enable RLS on all tables
    - All authenticated users can read service locations and tags
    - Only workers can insert/update/delete service locations and manage tags
*/

CREATE TABLE IF NOT EXISTS service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  category text NOT NULL DEFAULT 'community_center',
  address text NOT NULL DEFAULT '',
  suburb text NOT NULL DEFAULT '',
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  opening_hours text DEFAULT '',
  capacity_status text NOT NULL DEFAULT 'available' CHECK (capacity_status IN ('available', 'limited', 'full')),
  current_status text NOT NULL DEFAULT 'open' CHECK (current_status IN ('open', 'closed', 'limited')),
  description text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view services"
  ON service_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can insert services"
  ON service_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );

CREATE POLICY "Workers can update services"
  ON service_locations FOR UPDATE
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

CREATE POLICY "Workers can delete services"
  ON service_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );

CREATE TABLE IF NOT EXISTS service_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name text NOT NULL UNIQUE
);

ALTER TABLE service_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view tags"
  ON service_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can insert tags"
  ON service_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );

CREATE TABLE IF NOT EXISTS location_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES service_locations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES service_tags(id) ON DELETE CASCADE,
  UNIQUE(location_id, tag_id)
);

ALTER TABLE location_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view location tags"
  ON location_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can insert location tags"
  ON location_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );

CREATE POLICY "Workers can delete location tags"
  ON location_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'worker'
    )
  );
