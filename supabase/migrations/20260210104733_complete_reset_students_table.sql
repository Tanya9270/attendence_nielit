-- COMPLETE RESET: Delete all student records and rebuild constraints
-- This fixes all orphan data and constraint issues

-- Step 1: Delete ALL student records (fresh start)
DELETE FROM students;

-- Step 2: Drop unique constraints (but not primary key - it's referenced by attendance table)
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_roll_number;
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_user_id;
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_roll_number_per_course;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_roll_number_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_key;

-- Step 3: Add ONLY the composite unique constraint
-- This allows same roll number across different courses
ALTER TABLE students ADD CONSTRAINT unique_students_roll_number_per_course
  UNIQUE (roll_number, course_code);

-- Note: user_id is NOT unique (students can enroll in multiple courses)
-- Note: roll_number is NOT globally unique (can exist in multiple courses)

