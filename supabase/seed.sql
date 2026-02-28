-- seed.sql
-- Sample dev data for local development (requires a test user to exist)
-- Use a fixed UUID for the test user (create this user in Supabase Auth first)
-- INSERT INTO public.profiles (id, email, display_name, timezone)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'dev@heypoco.test', 'Dev User', 'Asia/Kolkata');
-- Sample entries (uncomment and adjust user_id after creating test user)
/*
 INSERT INTO public.entries (user_id, source, raw_text, type, extracted_fields, tags, entry_date) VALUES
 ('00000000-0000-0000-0000-000000000001', 'voice', 'Spent $45 at Whole Foods on groceries', 'finance',
 '{"amount": 45, "currency": "USD", "merchant": "Whole Foods", "category": "food & drink"}',
 ARRAY['groceries', 'food'], NOW()),
 
 ('00000000-0000-0000-0000-000000000001', 'voice', 'Today was great, felt really focused and productive', 'journal',
 '{"mood": "positive", "energy": "high", "highlights": ["felt focused", "productive day"]}',
 ARRAY['mood', 'productivity'], NOW()),
 
 ('00000000-0000-0000-0000-000000000001', 'voice', 'Send the contract to Sarah by Friday', 'task',
 '{"action": "send the contract to Sarah", "person": "Sarah", "deadline": "2026-02-28", "status": "open"}',
 ARRAY['task', 'sarah'], NOW()),
 
 ('00000000-0000-0000-0000-000000000001', 'voice', 'Dentist appointment tomorrow at 3pm', 'event',
 '{"title": "Dentist appointment", "scheduled_at": "2026-03-01T15:00:00"}',
 ARRAY['dentist', 'appointment'], NOW()),
 
 ('00000000-0000-0000-0000-000000000001', 'voice', 'Ahmed said he is moving to Dubai next month', 'note',
 '{"person": "Ahmed", "topic": "life update"}',
 ARRAY['ahmed', 'dubai'], NOW()),
 
 ('00000000-0000-0000-0000-000000000001', 'voice', 'Headache all morning, took paracetamol around 10', 'health',
 '{"symptom": "headache", "medication": "paracetamol", "time": "10:00"}',
 ARRAY['headache', 'medication'], NOW()),
 
 ('00000000-0000-0000-0000-000000000001', 'text', 'Uber ride to downtown $18.50', 'finance',
 '{"amount": 18.50, "currency": "USD", "merchant": "Uber", "category": "transport"}',
 ARRAY['transport', 'uber'], NOW());
 */
