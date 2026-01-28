const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const { Client } = require('pg');

(async function main() {
  const dbUrl = process.argv[2] || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Usage: node scripts/apply_schema_node.cjs <DATABASE_URL>');
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '..', 'database', 'schema_postgres.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Could not find', sqlPath);
    process.exit(2);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Try to prefer IPv4 to avoid IPv6 timeouts from some networks
  let client;
  try {
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || 5432;
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname ? url.pathname.replace(/^\//, '') : 'postgres';

    let address;
    try {
      const lookup = await dns.lookup(host, { family: 4 });
      address = lookup.address;
      console.log('Resolved IPv4 address for', host, '->', address);
    } catch (e) {
      console.warn('IPv4 lookup failed, falling back to hostname. Error:', e.message || e);
      address = host;
    }

    const config = {
      host: address,
      port: Number(port),
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000
    };

    client = new Client(config);
  } catch (err) {
    console.error('Invalid DATABASE_URL or parse error:', err && err.message ? err.message : err);
    process.exit(4);
  }

  try {
    await client.connect();
    console.log('Connected to DB, applying schema...');
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err && err.message ? err.message : err);
    process.exitCode = 3;
  } finally {
    if (client) await client.end().catch(() => {});
  }
})();
