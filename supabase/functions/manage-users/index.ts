import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CRITICAL: Handle preflight immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    // Security check
    const markFnKey = Deno.env.get("MARK_FN_API_KEY");
    if (markFnKey && req.headers.get("x-mark-fn-api-key") !== markFnKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { action, type, userId, username, password, name, course_code, course_name } = await req.json();

    if (action === 'delete') {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const email = username.includes('@') ? username.toLowerCase() : `${username.replace(/\//g, '_').toLowerCase()}@nielit.com`;
    const { data: userList } = await supabase.auth.admin.listUsers();
    let targetId = userList.users.find(u => u.email === email)?.id;

    if (!targetId) {
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (authErr) throw authErr;
      targetId = newUser.user.id;
    }

    await supabase.from('profiles').upsert({ id: targetId, role: type === 'teacher' ? 'teacher' : 'student' });

    if (type === 'teacher') {
      await supabase.from('courses').upsert({ course_code, course_name, teacher_name: name || username }, { onConflict: 'course_code' });
    } else {
      await supabase.from('students').upsert({ user_id: targetId, roll_number: username, name, course_code }, { onConflict: 'roll_number' });
    }

    return new Response(JSON.stringify({ ok: true, userId: targetId }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
      status: 200, // Return 200 so the frontend can read the error JSON
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});