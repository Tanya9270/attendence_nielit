const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const dbUrl = process.argv[2] || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Usage: node scripts/apply_schema_node.js <DATABASE_URL>');
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '..', 'database', 'schema_postgres.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Could not find', sqlPath);
    process.exit(2);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Connected to DB, applying schema...');
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err && err.message ? err.message : err);
    process.exitCode = 3;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
