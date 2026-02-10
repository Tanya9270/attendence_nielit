-- Clean up orphan student records that have NULL user_id
-- These were created before the user_id column was recreated as UUID
DELETE FROM students WHERE user_id IS NULL;
