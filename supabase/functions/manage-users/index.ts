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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, type, email, password, name, roll_number, course_code, course_name, userId } = body;

    console.log(`Action: ${action || 'create'}, Type: ${type}, Email: ${email}`);

    // --- DELETE LOGIC ---
    if (action === 'delete') {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // --- CREATE/UPDATE LOGIC ---
    // 1. Create or Find Auth User
    const { data: list } = await supabase.auth.admin.listUsers();
    let targetId = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id;

    if (!targetId) {
      console.log("Creating new Auth user...");
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true
      });
      if (authErr) throw authErr;
      targetId = newUser.user.id;
    }

    // 2. Update Profile Role
    console.log("Updating profile role...");
    await supabase.from('profiles').upsert({ id: targetId, role: type });

    // 3. Save Business Data
    if (type === 'teacher') {
      console.log("Saving Course/Teacher data...");
      const { error: cErr } = await supabase.from('courses').upsert({ 
        course_code, 
        course_name: course_name || "General", 
        teacher_name: name 
      });
      if (cErr) throw cErr;
    } else {
      console.log("Saving Student data...");
      const { error: sErr } = await supabase.from('students').upsert({ 
        user_id: targetId, 
        roll_number, 
        name, 
        course_code 
      });
      if (sErr) throw sErr;
    }

    return new Response(JSON.stringify({ ok: true, success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    console.error("Critical Error:", err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});