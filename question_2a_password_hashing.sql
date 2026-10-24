-- =============================================================================
-- QUESTION 2(a): SECURE APPLICATION — SALTED BCRYPT PASSWORD HASHING
-- =============================================================================
-- Run STEP 1 first -> Take "Before" screenshot in Supabase Table Editor.
-- Run STEP 2 next  -> Refresh Table Editor and take "After" screenshot.
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE TABLE & POPULATE WITH PLAIN TEXT PASSWORDS ("BEFORE")
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert users with plain text passwords to demonstrate the vulnerable state
INSERT INTO public.users (name, email, role, password_hash)
VALUES
    ('Anurag Pradhan', 'anuragpradhan2007@gmail.com', 'admin', 'demoACC'),
    ('Priya Sharma', 'priya.manager@retail.in', 'manager', 'StoreManager@2026'),
    ('Rohan Verma', 'rohan.staff@retail.in', 'staff', 'Warehouse#Pass12')
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash;

-- >>> TAKE SCREENSHOT 1 ("BEFORE") in Supabase Table Editor (users table) <<<

-- =============================================================================
-- STEP 2: RUN SALTED BCRYPT HASHING MIGRATION ("AFTER")
-- =============================================================================
-- Uses Blowfish (bf) crypt with cost factor 10 and a unique random cryptographic salt
UPDATE public.users
SET password_hash = crypt(password_hash, gen_salt('bf', 10));

-- >>> REFRESH AND TAKE SCREENSHOT 2 ("AFTER") in Supabase Table Editor <<<
