/*
  # Refresh exercise video links

  Several seeded YouTube videos are no longer public. Replace them with current
  public senior-friendly exercise videos so the cards have valid links and
  local thumbnails.
*/

UPDATE exercise_resources
SET video_url = CASE title
  WHEN 'Seated Arm and Shoulder Workout' THEN 'https://www.youtube.com/watch?v=I7LofxyxwEc'
  WHEN 'Indoor Walking Workout' THEN 'https://www.youtube.com/watch?v=bO6NNfX_1ns'
  WHEN 'Full Body Stretching for Seniors' THEN 'https://www.youtube.com/watch?v=zVCqkiqsz4I'
  WHEN 'Morning Stretch Wake-Up' THEN 'https://www.youtube.com/watch?v=zfly__3obJg'
  WHEN 'Balance Exercises to Prevent Falls' THEN 'https://www.youtube.com/watch?v=BNC4bi3Ucac'
  WHEN '10-Minute Gentle Exercise Routine' THEN 'https://www.youtube.com/watch?v=oumzMyqK-2I'
  ELSE video_url
END
WHERE title IN (
  'Seated Arm and Shoulder Workout',
  'Indoor Walking Workout',
  'Full Body Stretching for Seniors',
  'Morning Stretch Wake-Up',
  'Balance Exercises to Prevent Falls',
  '10-Minute Gentle Exercise Routine'
);
