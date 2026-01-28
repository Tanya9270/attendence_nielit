import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
  console.error('Set them in PowerShell for this session, e.g.:');
  console.error("$env:VITE_SUPABASE_URL='https://your-project.supabase.co'");
  console.error("$env:VITE_SUPABASE_ANON_KEY='your-anon-key'");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probeTables(tables) {
  const results = {};
  for (const t of tables) {
    try {
      const { data, error, status } = await supabase.from(t).select('id').limit(1);
      if (error) {
        results[t] = { exists: false, error };
      } else {
        results[t] = { exists: true, sample: data && data.length ? data[0] : null };
      }
    } catch (err) {
      results[t] = { exists: false, error: { message: err.message || String(err) } };
    }
  }
  return results;
}

async function run() {
  try {
    const tablesToCheck = ['users','courses','students','attendance','attendance_audit'];
    console.log('Probing tables:', tablesToCheck.join(', '));
    const res = await probeTables(tablesToCheck);
    console.log('Probe results:');
    for (const k of Object.keys(res)) {
      const r = res[k];
      if (r.exists) console.log(` - ${k}: exists`);
      else console.log(` - ${k}: MISSING (${r.error && r.error.message ? r.error.message : 'no details'})`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
}

run();
