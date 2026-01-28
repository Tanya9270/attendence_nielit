import db from '../db.js';

async function main() {
  try {
    const res = await db.query('SELECT id, username, role FROM users ORDER BY username');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err);
    process.exit(1);
  }
}

main();
