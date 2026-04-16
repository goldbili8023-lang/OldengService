/*
  # Allow public read access for demo mode

  The app can run without the login screen during prototype demos. Public map,
  help, exercise, and reporting data must remain readable with the anon key.
  Personal user data such as contacts and medications stays protected.
*/

DROP POLICY IF EXISTS "Public can view services" ON service_locations;
CREATE POLICY "Public can view services"
  ON service_locations FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view service tags" ON service_tags;
CREATE POLICY "Public can view service tags"
  ON service_tags FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view location tags" ON location_tags;
CREATE POLICY "Public can view location tags"
  ON location_tags FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view tutorials" ON tutorials;
CREATE POLICY "Public can view tutorials"
  ON tutorials FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view exercises" ON exercise_resources;
CREATE POLICY "Public can view exercises"
  ON exercise_resources FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view area stats" ON area_statistics;
CREATE POLICY "Public can view area stats"
  ON area_statistics FOR SELECT
  TO anon
  USING (true);
