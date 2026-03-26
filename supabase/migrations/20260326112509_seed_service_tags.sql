/*
  # Seed service tags

  Adding common service tags for filtering:
  - wheelchair accessible
  - dementia-friendly
  - free meals
  - transport available
  - multilingual staff
  - pet-friendly
  - drop-in welcome
  - appointment required
  - volunteer-run
  - government-funded
*/

INSERT INTO service_tags (tag_name) VALUES
  ('wheelchair accessible'),
  ('dementia-friendly'),
  ('free meals'),
  ('transport available'),
  ('multilingual staff'),
  ('pet-friendly'),
  ('drop-in welcome'),
  ('appointment required'),
  ('volunteer-run'),
  ('government-funded')
ON CONFLICT (tag_name) DO NOTHING;
