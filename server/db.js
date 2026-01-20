
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Configure DB connection. Some hosted Postgres providers use self-signed
// certificates; to allow connecting in those environments set
// `DATABASE_SSL=true` or `PGSSLMODE=no-verify` in the environment. This
// will set `ssl.rejectUnauthorized = false` for the pg Pool.
const poolConfig = {
  connectionString: process.env.DATABASE_URL
};

const disableCertVerify = (process.env.DATABASE_SSL || '').toLowerCase() === 'true'
  || (process.env.PGSSLMODE || '').toLowerCase() === 'no-verify'
  || (process.env.DISABLE_TLS_VERIFY || '').toLowerCase() === 'true';

if (disableCertVerify) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  console.warn('Database SSL: certificate verification disabled (DATABASE_SSL=true or PGSSLMODE=no-verify)');
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  // Some providers require SSL but provide valid certs; enable default SSL behaviour
  poolConfig.ssl = { rejectUnauthorized: true };
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
