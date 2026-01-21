import db from '../db.js';

async function migrate() {
  try {
    console.log('Altering students unique constraint to (roll_number, course_code)');

    // Drop old single-column unique constraint if it exists
    await db.query("ALTER TABLE students DROP CONSTRAINT IF EXISTS students_roll_number_key");

    // Add new unique constraint on roll_number + course_code
    await db.query(
      `ALTER TABLE students
       ADD CONSTRAINT IF NOT EXISTS students_roll_number_course_code_key
       UNIQUE (roll_number, course_code)`
    );

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
