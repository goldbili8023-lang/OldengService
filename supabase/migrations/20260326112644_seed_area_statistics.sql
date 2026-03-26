/*
  # Seed area statistics

  Adding demographic and service gap data for 8 Sydney suburbs
  to power the heat map and reports features.
*/

INSERT INTO area_statistics (area_name, elderly_population, service_count, support_gap_score, latitude, longitude) VALUES
  ('Redfern', 1200, 3, 4.2, -33.8932, 151.2048),
  ('Waterloo', 2800, 2, 7.8, -33.9002, 151.2056),
  ('Surry Hills', 1500, 2, 5.1, -33.8845, 151.2116),
  ('Glebe', 1800, 2, 4.5, -33.8792, 151.1836),
  ('Newtown', 1600, 2, 3.8, -33.8978, 151.1787),
  ('Marrickville', 3200, 1, 8.5, -33.9116, 151.1542),
  ('Erskineville', 900, 2, 2.3, -33.9018, 151.1862),
  ('Paddington', 2100, 1, 7.2, -33.8850, 151.2270)
ON CONFLICT DO NOTHING;
