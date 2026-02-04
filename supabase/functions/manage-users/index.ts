import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Security Check
    const markFnKey = Deno.env.get("MARK_FN_API_KEY");
    if (markFnKey && req.headers.get("x-mark-fn-api-key") !== markFnKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, username, password, name, course_code, course_name } = await req.json();
    
    // Normalize email to lowercase
    const email = username.includes('@') ? username.toLowerCase() : `${username.replace(/\//g, '_').toLowerCase()}@nielit.com`;

    let userId;

    // 2. SMART AUTH: Check if user exists before creating
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingUser = userList.users.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      console.log(`User ${email} exists. Using ID: ${userId}`);
    } else {
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (authError) throw authError;
      userId = newUser.user.id;
      console.log(`Created new user: ${email}`);
    }

    // 3. SET ROLE IN PROFILES
    const role = type === 'teacher' ? 'teacher' : 'student';
    await supabase.from('profiles').upsert({ id: userId, role });

    // 4. SMART DATABASE INSERT (Using Upsert to avoid "Duplicate Key" errors)
    if (type === 'teacher') {
      // If JAI-001 exists, update the teacher name and course name
      const { error: courseErr } = await supabase.from('courses').upsert({ 
        course_code: course_code, 
        course_name: course_name, 
        teacher_name: name || username 
      }, { onConflict: 'course_code' });
      
      if (courseErr) throw courseErr;
    } else {
      // If roll number exists, update the name and linked course
      const { error: studentErr } = await supabase.from('students').upsert({ 
        user_id: userId, 
        roll_number: username, 
        name: name, 
        course_code: course_code 
      }, { onConflict: 'roll_number' });
      
      if (studentErr) throw studentErr;
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      success: true, 
      message: "User synchronized successfully",
      userId 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    console.error("Management Error:", err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});