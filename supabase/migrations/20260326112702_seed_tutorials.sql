/*
  # Seed tutorials

  Adding helpful tutorial content for each core feature area.
*/

INSERT INTO tutorials (title, content, feature_name, sort_order) VALUES
  ('Getting Started with SafeConnect', 'SafeConnect is designed to help you stay safe and connected with your community. After logging in, you will see your home dashboard with quick access to all features. The bottom menu on your phone (or top menu on a computer) lets you navigate between sections.', 'general', 1),
  ('Managing Your Emergency Contacts', 'Your emergency contacts are people you trust who can help in an emergency. You can add up to 5 contacts with their name, relationship, and phone number. Setting a primary contact means they will appear on your home page for one-tap calling.', 'contacts', 2),
  ('Setting Up Medication Reminders', 'Add each of your medications with the name, dosage, time, and frequency. Each day, your home page will show how many medications you have taken. Tap the circle next to each medication to mark it as taken.', 'medications', 3),
  ('Finding Community Services Near You', 'The community map shows helpful places near you like health centres, food banks, and libraries. Use the filter buttons to show only certain types of services. Tap on any marker to see details including hours and contact information.', 'map', 4),
  ('Staying Active with Exercise Resources', 'Our exercise section has safe, gentle exercises designed for seniors. Each exercise includes a video you can follow along with, plus important safety tips. Always consult your doctor before starting new exercises.', 'exercise', 5),
  ('Adjusting Your Display Settings', 'If the text is too small, you can make it larger. Go to Settings (the gear icon) and choose Large or Extra Large font size. You can also turn on High Contrast mode which makes text darker and borders more visible.', 'settings', 6)
ON CONFLICT DO NOTHING;
