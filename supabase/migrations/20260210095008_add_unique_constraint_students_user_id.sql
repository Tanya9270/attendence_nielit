-- Add unique constraint on user_id to ensure one student per auth user
ALTER TABLE students ADD CONSTRAINT unique_students_user_id UNIQUE (user_id);

-- Ensure roll_number is also unique
ALTER TABLE students ADD CONSTRAINT unique_students_roll_number UNIQUE (roll_number);
