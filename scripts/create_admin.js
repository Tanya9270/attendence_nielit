import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import db from '../server/db.js';

dotenv.config();

async function createAdmin() {
  try {
    const username = 'admin';
    const password = 'nielit@123';
    const role = 'admin';

    // Check existing
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing && existing.rows && existing.rows.length > 0) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const res = await db.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [username, hash, role]);
    console.log('Created admin user with id', res.rows[0].id);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
