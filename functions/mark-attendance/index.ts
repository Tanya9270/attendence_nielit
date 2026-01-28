// Supabase Edge Function (Deno) - mark-attendance
// Deploy with `supabase functions deploy mark-attendance` after installing supabase CLI.

import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const body = await req.json().catch(() => ({}));
    const qr_payload = body.qr_payload || '';
    if (!qr_payload) return new Response(JSON.stringify({ error: 'missing_qr_payload' }), { status: 400 });

    // Call the RPC created in Postgres
    const { data, error } = await supabase.rpc('mark_attendance', { qr_payload });
    if (error) return new Response(JSON.stringify({ error }), { status: 500 });
    return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
