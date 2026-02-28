-- 003_enable_rls.sql
-- Row-Level Security policies for all tables
-- Postgres itself enforces user isolation — even buggy app code can't leak data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
-- Profiles: users can only access their own profile
DROP POLICY IF EXISTS "users can only see own profile" ON public.profiles;
CREATE POLICY "users can only see own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
-- Entries: users can only access their own entries
DROP POLICY IF EXISTS "users can only see own entries" ON public.entries;
CREATE POLICY "users can only see own entries" ON public.entries FOR ALL USING (auth.uid() = user_id);
