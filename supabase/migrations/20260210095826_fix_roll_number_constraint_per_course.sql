-- Remove the global unique constraint on roll_number
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_roll_number;

-- Add a composite unique constraint: roll_number should be unique per course
ALTER TABLE students ADD CONSTRAINT unique_students_roll_number_per_course
  UNIQUE (roll_number, course_code);
