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

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, type, email, password, name, roll_number, course_code, course_name, userId, listType } = body;

    // ── LIST action ─────────────────────────────────────────
    if (action === 'list') {
      if (listType === 'teachers') {
        // Return courses with teacher info (each course row = one teacher assignment)
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        return respond(data || []);
      }
      if (listType === 'students') {
        const { data, error } = await supabase.from('students').select('*');
        if (error) throw error;
        return respond(data || []);
      }
      if (listType === 'courses') {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        return respond({ ok: true, courses: data || [] });
      }
      return respond({ ok: false, error: 'Invalid list type' });
    }

    // ── DELETE action ───────────────────────────────────────
    if (action === 'delete') {
      const { deleteType } = body;

      if (deleteType === 'teacher') {
        // Delete by course row - teacher_id might be null
        // First try deleting by teacher_id (UUID) from auth
        const { data: course } = await supabase
          .from('courses')
          .select('teacher_id, teacher_name')
          .eq('teacher_id', userId)
          .maybeSingle();

        // Delete all courses for this teacher
        await supabase.from('courses').delete().eq('teacher_id', userId);

        // Delete profile and auth user if UUID is valid
        if (userId && typeof userId === 'string' && userId.includes('-')) {
          await supabase.from('profiles').delete().eq('id', userId);
          try {
            await supabase.auth.admin.deleteUser(userId);
          } catch (_e) { /* auth user may not exist */ }
        }

        return respond({ ok: true });
      }

      if (deleteType === 'student') {
        const studentId = body.studentId; // integer ID from students table

        // Get student info to find auth user
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .maybeSingle();

        // Delete student record
        await supabase.from('students').delete().eq('id', studentId);

        // If userId is a valid UUID, also delete auth user and profile
        if (userId && typeof userId === 'string' && userId.includes('-')) {
          await supabase.from('profiles').delete().eq('id', userId);
          try {
            await supabase.auth.admin.deleteUser(userId);
          } catch (_e) { /* auth user may not exist */ }
        }

        return respond({ ok: true });
      }

      // Legacy delete - try deleting by course_code for teachers
      if (body.courseCode) {
        await supabase.from('courses').delete().eq('course_code', body.courseCode);
        return respond({ ok: true });
      }

      // Generic delete by userId (UUID)
      if (userId) {
        await supabase.from('students').delete().eq('user_id', userId);
        await supabase.from('courses').delete().eq('teacher_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
        try {
          await supabase.auth.admin.deleteUser(userId);
        } catch (_e) { /* ignore if auth user doesn't exist */ }
      }

      return respond({ ok: true });
    }

    // ── CREATE action (default) ─────────────────────────────
    // Find or create auth user
    const { data: userList } = await supabase.auth.admin.listUsers();
    let targetId = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id;

    if (!targetId) {
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true
      });
      if (authErr) throw authErr;
      targetId = newUser.user.id;
    }

    // Set role in profiles
    await supabase.from('profiles').upsert({ id: targetId, role: type });

    if (type === 'teacher') {
      const { error: cErr } = await supabase.from('courses').upsert({
        course_code,
        course_name: course_name || "General Course",
        teacher_name: name,
        teacher_id: targetId
      }, { onConflict: 'course_code' });
      if (cErr) throw cErr;
    } else {
      // For students: store auth UUID as text in user_id
      // The students.user_id is integer, so we need a different approach
      // We'll store the auth UUID in a way that's retrievable

      // First, upsert the student record
      const { error: sErr } = await supabase.from('students').upsert({
        roll_number,
        name,
        course_code
      }, { onConflict: 'roll_number' });
      if (sErr) throw sErr;

      // Store the auth UUID mapping in profiles (already done above)
      // Store a reference: we'll use roll_number to link student <-> auth user
      // Update the student record with a note about the auth user
      // Since user_id is integer, we can't store UUID there directly
    }

    return respond({ ok: true, message: "Success", authId: targetId });

  } catch (err: any) {
    return respond({ ok: false, error: err.message });
  }
});
