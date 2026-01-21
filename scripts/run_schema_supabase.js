import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const sqlFile = path.join(process.cwd(), 'database', 'schema_postgres.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('Schema file not found at', sqlFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');

  const dbUrl = process.env.DATABASE_URL || process.argv[2];
  if (!dbUrl) {
    console.error('Usage: DATABASE_URL="postgres://..." node scripts/run_schema_supabase.js');
    console.error('Or: node scripts/run_schema_supabase.js "postgres://..."');
    process.exit(1);
  }

  // Allow insecure TLS when using providers with custom certs; set PGSSLMODE=no-verify or DATABASE_SSL=true
  const disableCertVerify = (process.env.DATABASE_SSL || '').toLowerCase() === 'true' || (process.env.PGSSLMODE || '').toLowerCase() === 'no-verify';

  const client = new Client({ connectionString: dbUrl, ssl: disableCertVerify ? { rejectUnauthorized: false } : undefined });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Applying schema from', sqlFile);

    // Split into statements and run sequentially to avoid very large single-query issues
    const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        console.error('Statement failed:', err.message || err);
        console.error('Failed SQL:', stmt.substring(0, 200).replace(/\n/g, ' '), '...');
        throw err;
      }
    }

    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err.message || err);
    process.exitCode = 2;
  } finally {
    try { await client.end(); } catch (e) {}
  }
}

main();
