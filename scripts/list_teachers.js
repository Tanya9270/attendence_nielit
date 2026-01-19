import db from '../server/db.js';

(async () => {
  try {
    const res = await db.query('SELECT id, username, role, last_login_at FROM users WHERE role = $1 ORDER BY username', ['teacher']);
    console.log('Teachers:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying teachers:', err);
    process.exit(1);
  }
})();
