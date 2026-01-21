import db from '../db.js';

async function main() {
  try {
    console.log('Querying users (username containing "/")...');
    const users = await db.query('SELECT id, username FROM users WHERE username LIKE $1 ORDER BY id', ['%/%']);
    console.table(users.rows);

    console.log('\nQuerying students...');
    const students = await db.query('SELECT id, roll_number, course_code FROM students ORDER BY id');
    console.table(students.rows);

    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

main();
