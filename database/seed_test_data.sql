-- Seed data for quick testing in Supabase (run in SQL editor)
-- 1) Insert a test course
INSERT INTO courses (course_code, course_name, teacher_name)
VALUES ('OVERVIEW-AI-1', 'Overview of AI Technology', 'Swati')
ON CONFLICT (course_code) DO NOTHING;

-- 2) Insert a test student (user_id NULL; app can link a user later)
INSERT INTO students (user_id, roll_number, name, course_code)
VALUES (NULL, '001/JAI/1', 'Swati', 'OVERVIEW-AI-1')
ON CONFLICT (roll_number) DO NOTHING;

-- After running the above, test the RPC:
-- SELECT * FROM mark_attendance('001/JAI/1');

-- Optional: create a lightweight user record (no password hash). If you need a usable login,
-- create a bcrypt hash for the password and update the row.
-- INSERT INTO users (username, password_hash, role) VALUES ('001/JAI/1', '<bcrypt-hash>', 'student');
