-- Fix user_id column type in students table to be UUID instead of INTEGER
-- Drop existing user_id column
ALTER TABLE students DROP COLUMN IF EXISTS user_id;

-- Add user_id column as UUID with foreign key reference to auth.users
ALTER TABLE students ADD COLUMN user_id UUID;

-- Add foreign key constraint
ALTER TABLE students ADD CONSTRAINT fk_students_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
