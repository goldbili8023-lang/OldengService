/*
  # Seed location-tag relationships

  Assigning relevant tags to service locations to make filtering useful.
*/

INSERT INTO location_tags (location_id, tag_id)
SELECT sl.id, st.id
FROM service_locations sl, service_tags st
WHERE
  (sl.service_name = 'Redfern Community Health Centre' AND st.tag_name IN ('wheelchair accessible', 'government-funded', 'appointment required'))
  OR (sl.service_name = 'Surry Hills Neighbourhood Centre' AND st.tag_name IN ('wheelchair accessible', 'drop-in welcome', 'multilingual staff'))
  OR (sl.service_name = 'OzHarvest Food Bank Waterloo' AND st.tag_name IN ('free meals', 'volunteer-run', 'drop-in welcome'))
  OR (sl.service_name = 'Glebe Library' AND st.tag_name IN ('wheelchair accessible', 'drop-in welcome', 'government-funded'))
  OR (sl.service_name = 'Newtown Neighbourhood Centre' AND st.tag_name IN ('wheelchair accessible', 'multilingual staff', 'drop-in welcome'))
  OR (sl.service_name = 'Inner West Transport Connect' AND st.tag_name IN ('transport available', 'appointment required', 'government-funded'))
  OR (sl.service_name = 'Paddington Community Housing' AND st.tag_name IN ('appointment required', 'government-funded'))
  OR (sl.service_name = 'Camperdown Counselling Service' AND st.tag_name IN ('wheelchair accessible', 'appointment required', 'multilingual staff'))
  OR (sl.service_name = 'Marrickville Community Health' AND st.tag_name IN ('wheelchair accessible', 'government-funded', 'multilingual staff'))
  OR (sl.service_name = 'Erskineville Seniors Hub' AND st.tag_name IN ('dementia-friendly', 'drop-in welcome', 'pet-friendly'))
  OR (sl.service_name = 'Alexandria Park Food Pantry' AND st.tag_name IN ('free meals', 'volunteer-run'))
  OR (sl.service_name = 'Darlington Library' AND st.tag_name IN ('wheelchair accessible', 'drop-in welcome'))
  OR (sl.service_name = 'Chippendale Community Transport' AND st.tag_name IN ('transport available', 'appointment required'))
  OR (sl.service_name = 'Ultimo Senior Wellness Clinic' AND st.tag_name IN ('wheelchair accessible', 'dementia-friendly', 'government-funded'))
  OR (sl.service_name = 'St Peters Food Relief' AND st.tag_name IN ('free meals', 'volunteer-run', 'drop-in welcome'))
  OR (sl.service_name = 'Eveleigh Housing Support' AND st.tag_name IN ('multilingual staff', 'appointment required'))
  OR (sl.service_name = 'Enmore Mental Health Drop-in' AND st.tag_name IN ('drop-in welcome', 'pet-friendly'))
  OR (sl.service_name = 'Annandale Community Centre' AND st.tag_name IN ('wheelchair accessible', 'dementia-friendly', 'multilingual staff', 'drop-in welcome'))
ON CONFLICT (location_id, tag_id) DO NOTHING;
