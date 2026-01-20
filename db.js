
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// If PGSSLMODE=require (e.g., Render Postgres), allow connecting to servers
// that use self-signed certificates by disabling strict certificate validation.
// This mirrors common libpq behavior for 'sslmode=require'.
if ((process.env.PGSSLMODE || '').toLowerCase() === 'require') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

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
