## Using Supabase as the backend (PostgREST + RLS + Edge Functions)

This document outlines the steps to switch from an Express backend to Supabase-first architecture.

High-level steps
- Ensure database schema is created in Supabase (you already ran `database/schema_postgres.sql`).
- Add Row Level Security (RLS) policies to tables to enforce access control.
- Add Postgres RPCs (stored procedures) for server-side operations that must run with elevated privileges or complex logic.
- Implement server-only logic as Supabase Edge Functions (Deno) when needed.
- Update client to call Supabase directly (auth + PostgREST + RPCs).

Notes about RLS and the current schema
- Your current schema uses integer `user_id` referencing `users(id)`. To use Supabase Auth and RLS idiomatically, you usually store the `auth.uid()` (a UUID) on rows (e.g. `owner uuid DEFAULT auth.uid()`), or keep a mapping table between `auth.users` and your `users` table.
- If you keep integer FK, policies will need to map `auth.uid()` to your internal user id (via a lookup query) — doable but requires an extra query in policies or an intermediate view.

Example RLS & RPC patterns (paste into Supabase SQL Editor and adapt):

-- 1) Enable RLS on `attendance` and allow only authenticated reads
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT (read) attendance rows
CREATE POLICY "Allow authenticated select" ON attendance
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Example: create a SECURITY DEFINER function (RPC) to mark attendance safely
-- This function runs with elevated privileges and inserts into attendance after applying app logic
-- Replace logic below with your actual QR verification + student lookup
CREATE OR REPLACE FUNCTION mark_attendance(qr_payload text)
RETURNS TABLE(id VARCHAR, student_id INTEGER, status TEXT) AS $$
  DECLARE
    _student_id INTEGER;
    _id TEXT := 'att-' || floor(EXTRACT(EPOCH FROM now()))::text || '-' || substring(md5(random()::text),1,8);
  BEGIN
    -- TODO: parse qr_payload and map to student_id
    -- Example placeholder: assume qr_payload is the roll_number
    SELECT id INTO _student_id FROM students WHERE roll_number = qr_payload LIMIT 1;
    IF _student_id IS NULL THEN
      RAISE EXCEPTION 'student_not_found';
    END IF;
    INSERT INTO attendance(id, student_id, date, status, scan_time, finalized, created_at, updated_at)
      VALUES(_id, _student_id, CURRENT_DATE, 'present', now(), FALSE, now(), now());
    RETURN QUERY SELECT _id, _student_id, 'present';
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Important: mark_attendance created with SECURITY DEFINER so Edge Functions or RPC callers
-- can call it without requiring the client to have full write rights on `attendance`.

Edge Functions
- Create an Edge Function when you need protected server logic or integration with external APIs.
- Example function scaffold is in `functions/mark-attendance` in this repo.

Client changes
- Use `supabase.rpc('mark_attendance', { qr_payload: '...' })` from the client or an authenticated Edge Function depending on trust model.

Security reminders
- Never use the `service_role` key in client code. Store it only in server/Edge Function environment variables or CI secrets.

If you want, I can:
- Help adapt policies to your exact auth mapping, or
- Create example policies and RPCs tailored to your `users` ↔ `auth.users` mapping, or
- Convert a few server routes to Edge Functions.

---
End of summary.
