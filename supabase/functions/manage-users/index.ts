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
        // userId is the UUID from auth.users - this is what we use to identify the student
        // Delete student record by user_id
        await supabase.from('students').delete().eq('user_id', userId);

        // Delete auth user and profile
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

    // Check if creating a new student when email already exists
    if (targetId && type === 'student') {
      // Check if this auth user is already a student
      const { data: existingStudent } = await supabase
        .from('students')
        .select('roll_number, name')
        .eq('user_id', targetId)
        .maybeSingle();

      if (existingStudent) {
        // User already has a student account - update their info if roll number matches
        if (existingStudent.roll_number === roll_number) {
          // Same roll number - update the student's info
          const { error: updateErr } = await supabase.from('students')
            .update({ name, email, course_code })
            .eq('user_id', targetId);
          if (updateErr) throw updateErr;

          // Also update auth metadata
          await supabase.auth.admin.updateUserById(targetId, {
            user_metadata: { roll_number, name, course_code, role: 'student' }
          });

          return respond({ ok: true, message: "Student info updated", authId: targetId });
        } else {
          // Different roll number - this email is already used by another student
          throw new Error(`This email is already registered for student ${existingStudent.name} (Roll: ${existingStudent.roll_number})`);
        }
      }
    }

    if (!targetId) {
      const metadata = type === 'student'
        ? { roll_number, name, course_code, role: 'student' }
        : { name, course_code, role: 'teacher' };
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: metadata
      });
      if (authErr) throw authErr;
      targetId = newUser.user.id;
    } else if (type === 'student') {
      // Existing auth user — update metadata with roll_number
      await supabase.auth.admin.updateUserById(targetId, {
        user_metadata: { roll_number, name, course_code, role: 'student' }
      });
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
      // For students: insert new student record
      const { error: sErr } = await supabase.from('students').insert({
        roll_number,
        name,
        email,
        course_code,
        user_id: targetId
      });

      if (sErr) {
        // Provide clear error message
        if (sErr.code === '23505') {
          if (sErr.message.includes('roll_number')) {
            throw new Error(`Roll number ${roll_number} is already registered`);
          } else if (sErr.message.includes('user_id')) {
            throw new Error('This account already has a student record');
          } else if (sErr.message.includes('email')) {
            throw new Error('This email is already registered');
          }
        }
        throw sErr;
      }
    }

    return respond({ ok: true, message: "Success", authId: targetId });

  } catch (err: any) {
    return respond({ ok: false, error: err.message });
  }
});
