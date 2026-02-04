import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-client@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Validate the custom API Key
    const markFnKey = Deno.env.get("MARK_FN_API_KEY");
    if (markFnKey && req.headers.get("x-mark-fn-api-key") !== markFnKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // 2. Initialize Supabase Admin Client (using Service Role Key)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, username, password, name, course_code, course_name } = await req.json();
    
    // Auto-generate email based on username (e.g., student001 -> student001@nielit.com)
    const email = username.includes('@') ? username : `${username.replace(/\//g, '_')}@nielit.com`;

    console.log(`Creating ${type} user: ${email}`);

    // 3. Create the Auth User (This creates the actual login)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;
    const userId = authUser.user.id;

    // 4. Set the Role in public.profiles table
    const role = type === 'teacher' ? 'teacher' : 'student';
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, role });
    
    if (profileError) throw profileError;

    // 5. Create Business Data (Student record or Course record)
    if (type === 'teacher') {
      const { error: courseError } = await supabase
        .from('courses')
        .upsert({ 
          course_code: course_code, 
          course_name: course_name, 
          teacher_name: name || username 
        });
      if (courseError) throw courseError;
    } else {
      const { error: studentError } = await supabase
        .from('students')
        .upsert({ 
          user_id: userId, 
          roll_number: username, 
          name: name, 
          course_code: course_code 
        });
      if (studentError) throw studentError;
    }

    return new Response(JSON.stringify({ success: true, userId, email }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    console.error("Management Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});