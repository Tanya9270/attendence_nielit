-- Add email column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
