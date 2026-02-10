-- Comprehensive fix: Ensure correct constraints on students table
-- Remove all orphan records again
DELETE FROM students WHERE user_id IS NULL;

-- Drop ALL unique constraints that might exist
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_roll_number;
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_user_id;
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_roll_number_per_course;

-- Add only the composite constraint: roll_number unique per course
ALTER TABLE students ADD CONSTRAINT unique_students_roll_number_per_course
  UNIQUE (roll_number, course_code);

-- Note: user_id should NOT be unique (students can enroll in multiple courses)
