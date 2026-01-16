
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // You can add more config here if needed (ssl, etc.)
});

const db = {
  async query(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return { rows: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  async connect() {
    const client = await pool.connect();
    return client;
  }
};

export default db;
