import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, type, email, password, name, roll_number, course_code, course_name, userId, listType } = body;

    // LIST action - returns data using service role key (bypasses RLS)
    if (action === 'list') {
      if (listType === 'teachers') {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        return new Response(JSON.stringify(data || []), { headers: jsonHeaders });
      }
      if (listType === 'students') {
        const { data, error } = await supabase.from('students').select('*');
        if (error) throw error;
        return new Response(JSON.stringify(data || []), { headers: jsonHeaders });
      }
      if (listType === 'courses') {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, courses: data || [] }), { headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Invalid list type' }), { headers: jsonHeaders });
    }

    // DELETE action
    if (action === 'delete') {
      // Clean up database records before deleting auth user
      await supabase.from('students').delete().eq('user_id', userId);
      await supabase.from('courses').delete().eq('teacher_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      // Delete the auth user last
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    // CREATE action (default)
    const { data: userList } = await supabase.auth.admin.listUsers();
    let targetId = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id;

    if (!targetId) {
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true
      });
      if (authErr) throw authErr;
      targetId = newUser.user.id;
    }

    await supabase.from('profiles').upsert({ id: targetId, role: type });

    if (type === 'teacher') {
      // Upsert with onConflict prevents "Duplicate Key" error
      const { error: cErr } = await supabase.from('courses').upsert({
        course_code,
        course_name: course_name || "General Course",
        teacher_name: name,
        teacher_id: targetId
      }, { onConflict: 'course_code' });
      if (cErr) throw cErr;
    } else {
      const { error: sErr } = await supabase.from('students').upsert({
        user_id: targetId,
        roll_number,
        name,
        course_code
      }, { onConflict: 'roll_number' });
      if (sErr) throw sErr;
    }

    return new Response(JSON.stringify({ ok: true, message: "Success" }), { headers: jsonHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 200, headers: jsonHeaders });
  }
});
