import db from '../db.js';

async function main() {
  try {
    console.log('Student courses:');
    const sc = await db.query('SELECT student_id, course_code FROM student_courses ORDER BY student_id');
    console.table(sc.rows);

    console.log('\nTeacher courses:');
    const tc = await db.query('SELECT user_id, course_code FROM teacher_courses ORDER BY user_id');
    console.table(tc.rows);

    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

main();
