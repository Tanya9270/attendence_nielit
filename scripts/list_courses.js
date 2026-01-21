import db from '../server/db.js';

async function list() {
  try {
    const res = await db.query('SELECT course_code, course_name, teacher_name FROM courses ORDER BY course_code');
    console.log('Courses:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying courses:', err);
    process.exit(1);
  }
}

list();
