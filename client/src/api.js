// client/src/api.js

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

// Safe JSON parser (avoids throws on empty/non-json responses)
const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

// Helper to create Supabase Headers
const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
  };
  // Always provide an Authorization bearer — prefer user token, otherwise use anon key
  const bearer = token || SUPABASE_KEY;
  headers['Authorization'] = `Bearer ${bearer}`;
  return headers;
};

export const api = {
  // --- 1. AUTHENTICATION (SECURE) ---
  async login(username, password) {
    try {
      // Map username to a login email for Supabase Auth
      const email = username.includes('@') ? username : `${username}@nielit.com`;

      // A. Login to get the Token
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const authData = await safeJson(authRes);
      if (!authRes.ok) return { ok: false, error: authData?.error_description || 'invalid_credentials' };

      // B. SECURITY CHECK: Fetch the REAL role from the 'profiles' table
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=role`, {
        headers: getHeaders(authData.access_token)
      });

      const profileData = await safeJson(profileRes);

      // Default to 'student' if no profile is found
      const realRole = profileData?.[0]?.role || 'student';

      return {
        ok: true,
        token: authData.access_token,
        user: {
          id: authData.user.id,
          username,
          role: realRole
        }
      };
    } catch (err) {
      console.error('Login error:', err);
      return { ok: false, error: 'network_error' };
    }
  },

  // --- 2. STUDENT DATA ---
  async getStudentMe(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&limit=1`, {
      headers: getHeaders(token)
    });
    const data = await safeJson(res);
    return data?.[0] ?? null;
  },

  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
      headers: getHeaders(token)
    });
    return await safeJson(res) || [];
  },

  // --- 3. ATTENDANCE LOGIC (Edge Function) ---
  async markMyAttendance(token, qrPayload) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-mark-fn-api-key': MARK_FN_KEY
      },
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    const data = await safeJson(response);
    return { ...data, ok: response.ok };
  },

  // --- 4. COURSE DATA ---
  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, {
      headers: getHeaders(token)
    });
    return await safeJson(res) || [];
  },

  // --- 5. ATTENDANCE STATS ---
  async getStudentAttendanceStatsByMonth(token, month, year) {
    let query = `${SUPABASE_URL}/rest/v1/attendance_stats?select=*`;
    if (month) query += `&month=eq.${month}`;
    if (year) query += `&year=eq.${year}`;

    const res = await fetch(query, { headers: getHeaders(token) });
    const data = await safeJson(res) || [];
    return { ok: res.ok, stats: data[0] || {}, recentAttendance: data };
  },

  // --- 6. ADMIN DASHBOARD DATA ---
  async getDailyAttendance(token, date, courseCode) {
    let url = `${SUPABASE_URL}/rest/v1/attendance?select=*,students(name,roll_number)&date=eq.${date}`;
    if (courseCode) url += `&course_code=eq.${courseCode}`;

    const res = await fetch(url, { headers: getHeaders(token) });
    const data = await safeJson(res) || [];
    return { ok: res.ok, data };
  },

  // --- 7. ADMIN ACTION METHODS ---

  // Get all teachers
  async getTeachers(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/teachers?select=*`, {
      headers: getHeaders(token)
    });
    return await safeJson(res) || [];
  },

  // Create Teacher with specific columns: username, password, course_code, course_name
  async createTeacher(token, username, password, courseCode, courseName) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/teachers`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        username: username,
        password: password,
        course_code: courseCode,
        course_name: courseName
      })
    });
    const data = await safeJson(res);
    return { ok: res.ok, status: res.status, body: data };
  },

  async createStudent(token, rollNumber, name, courseCodes) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ roll_number: rollNumber, name: name, course_code: courseCodes[0] })
    });
    const data = await safeJson(res);
    return { ok: res.ok, status: res.status, body: data };
  }
};