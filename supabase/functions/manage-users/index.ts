import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, type, userId, email, password, name, roll_number, course_code, course_name } = await req.json();

    if (action === 'delete') {
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Create or Get Auth User
    const { data: userList } = await supabase.auth.admin.listUsers();
    let targetId = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id;

    if (!targetId) {
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({ 
        email, password, email_confirm: true 
      });
      if (authErr) throw authErr;
      targetId = newUser.user.id;
    }

    // 2. Set Role in profiles table
    await supabase.from('profiles').upsert({ id: targetId, role: type });

    // 3. Save Teacher/Course or Student Data
    if (type === 'teacher') {
      const { error: err } = await supabase.from('courses').upsert({ 
        course_code, 
        course_name: course_name || "General Course", 
        teacher_name: name 
      }, { onConflict: 'course_code' });
      if (err) throw err;
    } else {
      const { error: err } = await supabase.from('students').upsert({ 
        user_id: targetId, 
        roll_number, 
        name, 
        course_code 
      }, { onConflict: 'roll_number' });
      if (err) throw err;
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 200, headers: corsHeaders });
  }
});