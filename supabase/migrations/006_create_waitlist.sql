-- Waitlist / access requests table
-- Stores every signup form submission as a source of truth,
-- independent of whether the email notification was delivered.

CREATE TABLE IF NOT EXISTS waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    message     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate emails
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

-- Public insert only — no auth needed (this is a pre-login form)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
    ON waitlist FOR INSERT
    WITH CHECK (true);

-- Only service role can read (you view it in Supabase dashboard)
CREATE POLICY "Service role reads waitlist"
    ON waitlist FOR SELECT
    USING (false);
