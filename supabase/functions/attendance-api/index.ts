import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// Helper: find student record by auth user UUID
// Since students.user_id is INTEGER and auth IDs are UUIDs,
// we look up the auth user's metadata to get roll_number, then query by that.
// Fallback: if metadata is missing, check profiles for role=student and try name match.
async function findStudentByAuthId(supabase: any, authUserId: string) {
  const { data: authUser } = await supabase.auth.admin.getUserById(authUserId);
  const meta = authUser?.user?.user_metadata;
  const rollNumber = meta?.roll_number;

  if (rollNumber) {
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("roll_number", rollNumber)
      .maybeSingle();
    if (student) return student;
  }

  // Fallback: if metadata missing, try matching by name from auth metadata
  if (meta?.name) {
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("name", meta.name)
      .maybeSingle();
    if (student) {
      // Auto-fix: update auth metadata with roll_number for future lookups
      await supabase.auth.admin.updateUserById(authUserId, {
        user_metadata: { ...meta, roll_number: student.roll_number, course_code: student.course_code }
      });
      return student;
    }
  }

  // Last resort: check if there's exactly one student with matching profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUserId)
    .maybeSingle();

  if (profile?.role === "student") {
    // Try to find student by querying all students and seeing if only one exists
    // (works for simple cases where admin just created one student for this user)
    const email = authUser?.user?.email;
    if (email) {
      // Check all students, try name-based partial match from email prefix
      const emailPrefix = email.split("@")[0].toLowerCase();
      const { data: students } = await supabase.from("students").select("*");
      if (students && students.length > 0) {
        const match = students.find((s: any) =>
          s.name?.toLowerCase().includes(emailPrefix) ||
          emailPrefix.includes(s.name?.toLowerCase()?.split(" ")[0])
        );
        if (match) {
          // Auto-fix metadata
          await supabase.auth.admin.updateUserById(authUserId, {
            user_metadata: { roll_number: match.roll_number, name: match.name, course_code: match.course_code, role: "student" }
          });
          return match;
        }
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // ── SERVER TIME ─────────────────────────────────────────
    if (action === "server-time") {
      const now = new Date();
      return respond({
        ok: true,
        server_time: now.toISOString(),
        server_time_ms: now.getTime(),
      });
    }

    // ── MARK ATTENDANCE (teacher scans student QR) ──────────
    if (action === "mark-attendance") {
      const { roll_number, course_code, scanner_id, date } = body;
      const today = date || new Date().toISOString().split("T")[0];

      // Find student
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("roll_number", roll_number)
        .maybeSingle();

      if (!student) {
        return respond({ ok: false, error: "student_not_found" });
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", student.id)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        return respond({ ok: true, message: "already_marked", student_name: student.name });
      }

      const attId = `${student.id}-${today}`;
      const { error } = await supabase.from("attendance").insert({
        id: attId,
        student_id: student.id,
        date: today,
        status: "present",
        scan_time: new Date().toISOString(),
        scanner_id: scanner_id || null,
        finalized: false,
      });

      if (error) throw error;

      return respond({ ok: true, message: "marked", student_name: student.name, roll_number: student.roll_number });
    }

    // ── MARK SELF (student scans teacher QR) ────────────────
    if (action === "mark-self") {
      const { qr_payload, student_user_id } = body;
      // QR format: ATTENDANCE|teacher_id|timestamp_ms
      const parts = (qr_payload || "").split("|");
      if (parts.length < 3 || parts[0] !== "ATTENDANCE") {
        return respond({ ok: false, error: "invalid_qr" });
      }

      const teacherId = parts[1];
      const qrTimestamp = parseInt(parts[2], 10);
      const now = Date.now();
      const delta = Math.abs(now - qrTimestamp) / 1000;

      if (delta > 30) {
        return respond({ ok: false, error: "qr_expired", delta_seconds: delta });
      }

      // Find student by auth user id (via user metadata -> roll_number)
      const student = await findStudentByAuthId(supabase, student_user_id);

      if (!student) {
        return respond({ ok: false, error: "student_not_found" });
      }

      // Verify teacher teaches this student's course
      const { data: course } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("course_code", student.course_code)
        .maybeSingle();

      if (!course) {
        return respond({ ok: false, error: "course_mismatch" });
      }

      const today = new Date().toISOString().split("T")[0];

      // Check duplicate
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", student.id)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        return respond({ ok: true, message: "already_marked" });
      }

      const attId = `${student.id}-${today}`;
      const { error } = await supabase.from("attendance").insert({
        id: attId,
        student_id: student.id,
        date: today,
        status: "present",
        scan_time: new Date().toISOString(),
        scanner_id: null,
        finalized: false,
      });

      if (error) throw error;

      return respond({ ok: true, message: "marked", student_name: student.name });
    }

    // ── GET DAILY ATTENDANCE ────────────────────────────────
    if (action === "get-daily") {
      const { date, course_code } = body;
      const today = date || new Date().toISOString().split("T")[0];

      // Get all students for this course
      let studentsQuery = supabase.from("students").select("*");
      if (course_code) studentsQuery = studentsQuery.eq("course_code", course_code);
      const { data: students } = await studentsQuery;

      if (!students || students.length === 0) {
        return respond({ ok: true, students: [], finalized: false, date: today });
      }

      const studentIds = students.map((s: any) => s.id);

      // Get attendance for these students on this date
      const { data: records } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", today)
        .in("student_id", studentIds);

      const attendanceMap: Record<number, any> = {};
      let isFinalized = false;
      (records || []).forEach((r: any) => {
        attendanceMap[r.student_id] = r;
        if (r.finalized) isFinalized = true;
      });

      const result = students.map((s: any) => {
        const att = attendanceMap[s.id];
        return {
          id: s.id,
          roll_number: s.roll_number,
          name: s.name,
          course_code: s.course_code,
          status: att ? att.status : "absent",
          scan_time: att ? att.scan_time : null,
        };
      });

      return respond({ ok: true, students: result, finalized: isFinalized, date: today });
    }

    // ── GET MONTHLY ATTENDANCE ──────────────────────────────
    if (action === "get-monthly") {
      const { month, year, course_code } = body;
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Get students
      let studentsQuery = supabase.from("students").select("*");
      if (course_code) studentsQuery = studentsQuery.eq("course_code", course_code);
      const { data: students } = await studentsQuery;

      // Get course information to include course_name and faculty
      let courseInfo: any = { course_code: course_code || '', course_name: '', faculty: '[Faculty Name]' };
      if (course_code) {
        const { data: course } = await supabase
          .from("courses")
          .select("*")
          .eq("course_code", course_code)
          .maybeSingle();
        if (course) {
          courseInfo.course_name = course.name || course.course_name || course.course_code;
          // If course has teacher_id, fetch teacher name; otherwise use course fields if available
          if (course.teacher_name) {
            courseInfo.faculty = course.teacher_name;
          } else if (course.faculty_name) {
            courseInfo.faculty = course.faculty_name;
          } else if (course.faculty) {
            courseInfo.faculty = course.faculty;
          }
        }
      }

      if (!students || students.length === 0) {
        return respond({
          ok: true,
          students: [],
          workingDays: 0,
          month: m,
          year: y,
          monthName: new Date(y, m - 1).toLocaleString("en-US", { month: "long" }),
          course_code: courseInfo.course_code,
          course_name: courseInfo.course_name,
          faculty: courseInfo.faculty,
        });
      }

      const studentIds = students.map((s: any) => s.id);

      // Get all attendance records for this month
      const { data: records } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("student_id", studentIds);

      // Build attendance map: studentId -> { date -> record }
      const attMap: Record<number, Record<string, any>> = {};
      (records || []).forEach((r: any) => {
        if (!attMap[r.student_id]) attMap[r.student_id] = {};
        attMap[r.student_id][r.date] = r;
      });

      // Calculate working days (exclude weekends)
      let workingDays = 0;
      const allDates: string[] = [];
      for (let d = 1; d <= lastDay; d++) {
        const dt = new Date(y, m - 1, d);
        const day = dt.getDay();
        if (day !== 0 && day !== 6) {
          workingDays++;
          allDates.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        }
      }

      const result = students.map((s: any) => {
        const studentAtt = attMap[s.id] || {};
        let present = 0;
        let absent = 0;

        const dailyRecords = allDates.map((dt) => {
          const rec = studentAtt[dt];
          if (rec && rec.status === "present") {
            present++;
            return { date: dt, status: "present", scan_time: rec.scan_time };
          } else {
            absent++;
            return { date: dt, status: "absent", scan_time: null };
          }
        });

        const percentage = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

        return {
          id: s.id,
          roll_number: s.roll_number,
          name: s.name,
          course_code: s.course_code,
          present,
          absent,
          percentage,
          dailyRecords,
        };
      });

      return respond({
        ok: true,
        students: result,
        workingDays,
        month: m,
        year: y,
        monthName: new Date(y, m - 1).toLocaleString("en-US", { month: "long" }),
        dates: allDates,
        course_code: courseInfo.course_code,
        course_name: courseInfo.course_name,
        faculty: courseInfo.faculty,
      });
    }

    // ── FINALIZE ATTENDANCE ─────────────────────────────────
    if (action === "finalize") {
      const { date, course_code } = body;
      const today = date || new Date().toISOString().split("T")[0];

      let query = supabase.from("attendance").update({ finalized: true }).eq("date", today);

      if (course_code) {
        // Get student IDs for this course
        const { data: students } = await supabase
          .from("students")
          .select("id")
          .eq("course_code", course_code);
        if (students && students.length > 0) {
          query = query.in("student_id", students.map((s: any) => s.id));
        }
      }

      const { error } = await query;
      if (error) throw error;

      return respond({ ok: true, message: "finalized" });
    }

    // ── STUDENT: GET MY PROFILE ─────────────────────────────
    if (action === "student-me") {
      const { user_id } = body;

      const student = await findStudentByAuthId(supabase, user_id);

      if (!student) {
        return respond({ ok: false, error: "not_found" });
      }

      // Get course info
      const { data: course } = await supabase
        .from("courses")
        .select("course_name")
        .eq("course_code", student.course_code)
        .maybeSingle();

      return respond({
        ...student,
        course_name: course?.course_name || student.course_code,
      });
    }

    // ── STUDENT: ATTENDANCE STATS ───────────────────────────
    if (action === "student-stats") {
      const { user_id, month, year } = body;

      const student = await findStudentByAuthId(supabase, user_id);

      if (!student) {
        return respond({ ok: false, error: "not_found" });
      }

      const m = parseInt(month, 10) || new Date().getMonth() + 1;
      const y = parseInt(year, 10) || new Date().getFullYear();
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Working days
      let workingDays = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dt = new Date(y, m - 1, d);
        const day = dt.getDay();
        if (day !== 0 && day !== 6) workingDays++;
      }

      // Get attendance records
      const { data: records } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      const present = (records || []).filter((r: any) => r.status === "present").length;
      const absent = workingDays - present;
      const percentage = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

      return respond({
        ok: true,
        stats: { workingDays, present, absent, percentage },
        recentAttendance: (records || []).map((r: any) => ({
          date: r.date,
          status: r.status,
          scan_time: r.scan_time,
        })),
        monthName: new Date(y, m - 1).toLocaleString("en-US", { month: "long" }),
        month: m,
        year: y,
      });
    }

    // ── GET COURSES (for teacher) ───────────────────────────
    if (action === "get-courses") {
      const { teacher_id } = body;

      let query = supabase.from("courses").select("*");
      if (teacher_id) {
        query = query.eq("teacher_id", teacher_id);
      }
      const { data } = await query;

      return respond({ ok: true, courses: data || [] });
    }

    return respond({ ok: false, error: "unknown_action" }, 400);
  } catch (err: any) {
    console.error("attendance-api error:", err);
    return respond({ ok: false, error: err.message }, 200);
  }
});
