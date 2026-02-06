import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import db from '../db.js';

// Lazy-init Supabase admin client for token verification
let _supabase = null;
function getSupabase() {
  if (!_supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ ok: false, error: 'no_token' });
  }

  // 1) Try verifying with the server's own JWT_SECRET
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (!err) {
      req.user = user;
      return next();
    }

    // 2) Fallback: verify as a Supabase JWT
    try {
      const sb = getSupabase();
      if (!sb) {
        console.error('Supabase not configured – cannot verify token');
        return res.status(403).json({ ok: false, error: 'invalid_token' });
      }

      const { data: { user: supaUser }, error: authErr } = await sb.auth.getUser(token);
      if (authErr || !supaUser) {
        return res.status(403).json({ ok: false, error: 'invalid_token' });
      }

      // Get role from Supabase profiles table
      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', supaUser.id)
        .single();

      const role = profile?.role || 'student';

      // Find or auto-provision user in the Express DB
      const dbUser = await findOrCreateExpressUser(sb, supaUser, role);

      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        role: role
      };

      next();
    } catch (e) {
      console.error('Supabase auth fallback error:', e);
      return res.status(403).json({ ok: false, error: 'invalid_token' });
    }
  });
}

/**
 * Finds an existing Express DB user by email, or creates one and syncs
 * related data (student / teacher records) from Supabase.
 */
async function findOrCreateExpressUser(sb, supaUser, role) {
  // Look up by email first
  const { rows: existing } = await db.query(
    'SELECT * FROM users WHERE email = $1 OR username = $1',
    [supaUser.email]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create user record
  const { rows: [newUser] } = await db.query(
    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [supaUser.email, supaUser.email, 'supabase-managed', role]
  );

  // Sync role-specific data from Supabase into the Express DB
  try {
    if (role === 'student') {
      await syncStudentData(sb, supaUser.id, newUser.id);
    } else if (role === 'teacher') {
      await syncTeacherData(sb, supaUser.id, newUser.id);
    }
  } catch (syncErr) {
    // Non-fatal: user is created even if data sync partially fails
    console.error('Data sync warning:', syncErr.message);
  }

  return newUser;
}

async function syncStudentData(sb, supabaseUserId, expressUserId) {
  const { data: studentData } = await sb
    .from('students')
    .select('*')
    .eq('user_id', supabaseUserId)
    .single();

  if (!studentData) return;

  // Create student record in Express DB
  await db.query(
    `INSERT INTO students (user_id, roll_number, name, course_code)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (roll_number) DO UPDATE SET user_id = $1, name = $3, course_code = $4`,
    [expressUserId, studentData.roll_number, studentData.name, studentData.course_code]
  );

  // Ensure course exists
  if (studentData.course_code) {
    await db.query(
      `INSERT INTO courses (course_code, course_name)
       VALUES ($1, $2)
       ON CONFLICT (course_code) DO NOTHING`,
      [studentData.course_code, studentData.course_code]
    );

    // Map student → course
    const { rows: stuRows } = await db.query(
      'SELECT id FROM students WHERE user_id = $1', [expressUserId]
    );
    if (stuRows.length > 0) {
      await db.query(
        `INSERT INTO student_courses (student_id, course_code)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [stuRows[0].id, studentData.course_code]
      );
    }
  }
}

async function syncTeacherData(sb, supabaseUserId, expressUserId) {
  const { data: courseData } = await sb
    .from('courses')
    .select('*')
    .eq('teacher_id', supabaseUserId);

  if (!courseData || courseData.length === 0) return;

  for (const course of courseData) {
    // Upsert course
    await db.query(
      `INSERT INTO courses (course_code, course_name, teacher_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (course_code) DO UPDATE SET teacher_name = $3`,
      [course.course_code, course.course_name || course.course_code, course.teacher_name]
    );

    // Map teacher → course
    await db.query(
      `INSERT INTO teacher_courses (user_id, course_code)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [expressUserId, course.course_code]
    );
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'insufficient_permissions' });
    }
    next();
  };
}
