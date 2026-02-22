-- seed.sql
-- Sample dev data for local development (requires a test user to exist)

-- Use a fixed UUID for the test user (create this user in Supabase Auth first)
-- INSERT INTO public.profiles (id, email, display_name)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'dev@heypoco.test', 'Dev User');

-- Sample entries (uncomment and adjust user_id after creating test user)
/*
INSERT INTO public.entries (user_id, type, raw_text, extracted_fields, tags) VALUES
    ('00000000-0000-0000-0000-000000000001', 'finance', 'Spent $45 at Whole Foods on groceries', '{"amount": 45, "currency": "USD", "merchant": "Whole Foods", "category": "groceries"}', ARRAY['groceries', 'food']),
    ('00000000-0000-0000-0000-000000000001', 'finance', 'Uber ride to downtown $18.50', '{"amount": 18.50, "currency": "USD", "merchant": "Uber", "category": "transportation"}', ARRAY['transport', 'uber']),
    ('00000000-0000-0000-0000-000000000001', 'career', 'Applied to Senior Frontend role at Stripe', '{"company": "Stripe", "role": "Senior Frontend Engineer"}', ARRAY['job-application', 'frontend']),
    ('00000000-0000-0000-0000-000000000001', 'link', 'Interesting article on AI agents https://example.com/ai-agents', '{"url": "https://example.com/ai-agents", "category": "technology"}', ARRAY['ai', 'reading']),
    ('00000000-0000-0000-0000-000000000001', 'general', 'Need to call the dentist for a checkup', '{"notes": "Schedule dentist appointment"}', ARRAY['health', 'todo']);
*/
