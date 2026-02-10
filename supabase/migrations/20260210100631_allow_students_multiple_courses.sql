-- Remove unique constraint on user_id to allow students to enroll in multiple courses
-- A student can be in multiple courses with different roll numbers
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_user_id;
