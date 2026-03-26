/*
  # Seed exercise resources

  Adding 10 senior-friendly exercise resources across categories:
  chair exercises, walking, stretching, balance, and general.
*/

INSERT INTO exercise_resources (title, category, description, video_url, safety_note, duration) VALUES
  ('Gentle Chair Yoga for Beginners', 'chair', 'A calming chair yoga routine to improve flexibility and reduce stiffness. No equipment needed.', 'https://www.youtube.com/watch?v=KEjiXtb2hRg', 'Use a sturdy chair without wheels. Hold onto the chair if you feel unsteady.', '15 min'),
  ('Seated Arm and Shoulder Workout', 'chair', 'Strengthen your arms and shoulders while seated. Great for improving daily mobility.', 'https://www.youtube.com/watch?v=r4gMxCjPMJQ', 'Start without weights. Add light weights (500g) only when comfortable.', '12 min'),
  ('Chair-Based Leg Exercises', 'chair', 'Simple leg exercises you can do from a chair to maintain lower body strength.', 'https://www.youtube.com/watch?v=YbX7Wd8jQ-Q', 'Keep movements slow and controlled. Stop if you feel any knee pain.', '10 min'),
  ('Morning Walking Routine', 'walking', 'Tips and motivation for a safe morning walk. Includes warm-up and cool-down guidance.', 'https://www.youtube.com/watch?v=njeZ29umqVE', 'Wear supportive shoes. Walk on flat, even surfaces. Carry your phone for safety.', '20 min'),
  ('Indoor Walking Workout', 'walking', 'A gentle walking workout you can do at home when the weather is not suitable for outdoors.', 'https://www.youtube.com/watch?v=JORnPiTP8LE', 'Clear the floor area of obstacles. Wear non-slip shoes or socks.', '15 min'),
  ('Full Body Stretching for Seniors', 'stretching', 'A complete stretching routine from head to toe. Improves range of motion and reduces aches.', 'https://www.youtube.com/watch?v=6FwGPhmk_oo', 'Never bounce while stretching. Breathe steadily and stretch to comfort, not pain.', '18 min'),
  ('Morning Stretch Wake-Up', 'stretching', 'Gentle stretches to start your day feeling limber and energised.', 'https://www.youtube.com/watch?v=3SvBNm0FAbk', 'Do these stretches slowly after waking. Stay near a wall or chair for balance.', '8 min'),
  ('Balance Exercises to Prevent Falls', 'balance', 'Important exercises that help improve balance and reduce the risk of falls.', 'https://www.youtube.com/watch?v=3k09olo0cLI', 'Always have a chair or wall nearby for support. Do not close your eyes during balance exercises.', '12 min'),
  ('Tai Chi for Beginners', 'balance', 'An introduction to Tai Chi movements that improve balance, coordination, and relaxation.', 'https://www.youtube.com/watch?v=hIOHGrYCEJ4', 'Wear loose, comfortable clothing. Practice in a well-lit area with enough room to move.', '20 min'),
  ('10-Minute Gentle Exercise Routine', 'general', 'A quick and easy full-body exercise routine suitable for all fitness levels.', 'https://www.youtube.com/watch?v=B07-49TZl_4', 'Listen to your body. Rest when needed and drink water before and after.', '10 min')
ON CONFLICT DO NOTHING;
