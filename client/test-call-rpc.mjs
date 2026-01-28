#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadDotenv(path = '.env') {
  try {
    const src = fs.readFileSync(path, 'utf8');
    const out = {};
    for (const line of src.split(/\r?\n/)) {
      const l = line.trim();
      if (!l || l.startsWith('#')) continue;
      const eq = l.indexOf('=');
      if (eq === -1) continue;
      const key = l.slice(0, eq).trim();
      const val = l.slice(eq + 1).trim();
      out[key] = val;
    }
    return out;
  } catch (err) {
    return {}; 
  }
}

const env = loadDotenv('.env');
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in client/.env');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  try {
    console.log('Calling RPC: mark_attendance with sample payload "student:123"');
    const { data, error } = await supabase.rpc('mark_attendance', { qr_payload: 'student:123' });
    if (error) {
      console.error('RPC error:', error);
      process.exitCode = 1;
      return;
    }
    console.log('RPC response:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  }
}

main();
