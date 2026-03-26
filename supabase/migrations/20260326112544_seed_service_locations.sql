/*
  # Seed service locations

  Adding 18 realistic community service locations across Sydney suburbs
  covering health, food banks, community centres, libraries, transport, housing, and counselling.
*/

INSERT INTO service_locations (service_name, category, address, suburb, latitude, longitude, opening_hours, capacity_status, current_status, description) VALUES
  ('Redfern Community Health Centre', 'health', '103-105 Redfern St', 'Redfern', -33.8932, 151.2048, 'Mon-Fri 8:30am-5pm', 'available', 'open', 'Provides general health check-ups, immunisations, and chronic disease management for seniors.'),
  ('Surry Hills Neighbourhood Centre', 'community_center', '405 Crown St', 'Surry Hills', -33.8845, 151.2116, 'Mon-Sat 9am-5pm', 'available', 'open', 'A welcoming community hub with social groups, art classes, and support services for older residents.'),
  ('OzHarvest Food Bank Waterloo', 'food_bank', '46-62 Maddox St', 'Waterloo', -33.9002, 151.2056, 'Tue & Thu 10am-2pm', 'limited', 'open', 'Free food distribution for community members in need. Bring your own bags.'),
  ('Glebe Library', 'library', '186 Glebe Point Rd', 'Glebe', -33.8792, 151.1836, 'Mon-Sat 10am-6pm, Sun 1pm-5pm', 'available', 'open', 'Public library with large print books, audiobooks, free internet, and regular seniors book club.'),
  ('Newtown Neighbourhood Centre', 'community_center', '1 Bedford St', 'Newtown', -33.8978, 151.1787, 'Mon-Fri 9am-5pm', 'available', 'open', 'Offers social activities, financial counselling, and aged care navigation support.'),
  ('Inner West Transport Connect', 'transport', '22 Allen St', 'Leichhardt', -33.8843, 151.1566, 'Mon-Fri 8am-4pm', 'limited', 'open', 'Community transport for medical appointments and shopping trips for seniors over 65.'),
  ('Paddington Community Housing', 'housing', '395 Oxford St', 'Paddington', -33.8850, 151.2270, 'Mon-Fri 9am-4pm', 'full', 'limited', 'Social and affordable housing assistance, tenancy support, and housing advocacy.'),
  ('Camperdown Counselling Service', 'counseling', '50 Carillon Ave', 'Camperdown', -33.8897, 151.1782, 'Mon-Fri 10am-6pm', 'available', 'open', 'Free and confidential counselling for anxiety, grief, loneliness, and aged care transitions.'),
  ('Marrickville Community Health', 'health', '155 Livingstone Rd', 'Marrickville', -33.9116, 151.1542, 'Mon-Fri 8am-5pm', 'available', 'open', 'Allied health services including physiotherapy, podiatry, and dietetics for seniors.'),
  ('Erskineville Seniors Hub', 'community_center', '104 Erskineville Rd', 'Erskineville', -33.9018, 151.1862, 'Mon-Fri 9am-4pm', 'available', 'open', 'Day programs, morning tea socials, and technology classes for seniors.'),
  ('Alexandria Park Food Pantry', 'food_bank', '41 Henderson Rd', 'Alexandria', -33.9072, 151.1948, 'Wed & Fri 11am-1pm', 'available', 'open', 'Weekly free groceries and pantry staples for low-income seniors.'),
  ('Darlington Library', 'library', '62 Vine St', 'Darlington', -33.8924, 151.1952, 'Tue-Sat 10am-5pm', 'available', 'open', 'Quiet reading space with accessibility ramps, hearing loop, and computer help sessions.'),
  ('Chippendale Community Transport', 'transport', '15 Shepherd St', 'Chippendale', -33.8876, 151.1963, 'Mon-Fri 7:30am-3:30pm', 'available', 'open', 'Door-to-door transport for eligible seniors. Pre-booking required.'),
  ('Ultimo Senior Wellness Clinic', 'health', '68 Mary Ann St', 'Ultimo', -33.8787, 151.1985, 'Mon-Fri 9am-5pm', 'limited', 'open', 'Wellness checks, falls prevention programs, and medication reviews.'),
  ('St Peters Food Relief', 'food_bank', '39 Unwins Bridge Rd', 'St Peters', -33.9165, 151.1782, 'Mon 9am-12pm', 'available', 'open', 'Emergency food parcels and ongoing food relief for vulnerable community members.'),
  ('Eveleigh Housing Support', 'housing', '245 Wilson St', 'Eveleigh', -33.8952, 151.1912, 'Mon-Thu 9am-4pm', 'limited', 'open', 'Assistance with housing applications, rent subsidy information, and tenancy rights.'),
  ('Enmore Mental Health Drop-in', 'counseling', '173 Enmore Rd', 'Enmore', -33.9006, 151.1720, 'Mon-Sat 10am-4pm', 'available', 'open', 'Peer support, wellbeing activities, and mental health first aid. No referral needed.'),
  ('Annandale Community Centre', 'community_center', '79 Johnston St', 'Annandale', -33.8820, 151.1704, 'Mon-Fri 9am-5pm, Sat 9am-12pm', 'available', 'open', 'Community events, seniors yoga, craft groups, and multicultural programs.')
ON CONFLICT DO NOTHING;
