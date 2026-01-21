import db from '../db.js';

async function migrate() {
  try {
    console.log('Creating join tables student_courses and teacher_courses (if not exists)');

    await db.query(`
      CREATE TABLE IF NOT EXISTS student_courses (
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_code VARCHAR(20) NOT NULL,
        PRIMARY KEY (student_id, course_code)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS teacher_courses (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code VARCHAR(20) NOT NULL,
        PRIMARY KEY (user_id, course_code)
      )
    `);

    console.log('Populating student_courses from existing students.course_code');
    await db.query(`
      INSERT INTO student_courses (student_id, course_code)
      SELECT id, course_code FROM students WHERE course_code IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    console.log('Populating teacher_courses from courses.teacher_name (maps username to users.id)');
    await db.query(`
      INSERT INTO teacher_courses (user_id, course_code)
      SELECT u.id, c.course_code FROM courses c JOIN users u ON u.username = c.teacher_name WHERE c.teacher_name IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
