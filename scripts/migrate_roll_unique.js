import db from '../db.js';

async function migrate() {
  try {
    console.log('Altering students unique constraint to (roll_number, course_code)');

    // Use a DO block to conditionally drop/add constraints in a way that's compatible
    // with older Postgres versions that may not support IF EXISTS on ADD CONSTRAINT.
    const sql = `DO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_roll_number_key') THEN\n    EXECUTE 'ALTER TABLE students DROP CONSTRAINT students_roll_number_key';\n  END IF;\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_roll_number_course_code_key') THEN\n    EXECUTE 'ALTER TABLE students ADD CONSTRAINT students_roll_number_course_code_key UNIQUE (roll_number, course_code)';\n  END IF;\nEND$$;`;

    await db.query(sql);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
