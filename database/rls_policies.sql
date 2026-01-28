-- Row Level Security example policies
-- Run these in Supabase SQL Editor as role `postgres`.

-- Enable RLS on attendance to protect rows from direct writes from clients
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT attendance rows
CREATE POLICY IF NOT EXISTS allow_authenticated_select_on_attendance
  ON attendance
  FOR SELECT
  USING (auth.role() IS NOT NULL);

-- Allow authenticated users to SELECT students
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_authenticated_select_on_students
  ON students
  FOR SELECT
  USING (auth.role() IS NOT NULL);

-- Important notes:
-- 1) The `mark_attendance` RPC is created with `SECURITY DEFINER` and will run with elevated privileges,
--    so RPC callers can invoke it even if RLS prevents direct INSERT on `attendance`.
-- 2) If you use Supabase Auth, consider creating a mapping between `auth.users` (UUID) and your
--    `users(id)` integer column to implement per-user write policies. This example only enables
--    authenticated SELECT access for basic protection.
