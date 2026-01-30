// client/src/api.js

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

// Helper to create Supabase Headers
const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const api = {
  // 1. AUTHENTICATION (Using Supabase Auth)
  async login(username, password) {
    try {
      // Map username to a login email for Supabase Auth
      const email = username.includes('@') ? username : `${username}@nielit.com`;

      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error_description || 'invalid_credentials' };

      // Simple role detection: If username contains 'admin', they are a teacher
      const role = username.toLowerCase().includes('admin') ? 'teacher' : 'student';

      return {
        ok: true,
        token: data.access_token,
        user: { id: data.user.id, username, role }
      };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  },

  // 2. STUDENT DATA (Using PostgREST)
  async getStudentMe(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&limit=1`, {
      headers: getHeaders(token)
    });
    const data = await res.json();
    return data[0];
  },

  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
      headers: getHeaders(token)
    });
    return res.json();
  },

  // 3. ATTENDANCE LOGIC (The Edge Function we fixed)
  async markMyAttendance(token, qrPayload) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-mark-fn-api-key': MARK_FN_KEY // Our verified fix
      },
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    const data = await response.json();
    // Map response so frontend thinks it's a success
    return { ...data, ok: response.ok };
  },

  // 4. COURSE DATA
  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, {
      headers: getHeaders(token)
    });
    return res.json();
  },

  // 5. ATTENDANCE STATS
  async getStudentAttendanceStatsByMonth(token, month, year) {
    let query = `${SUPABASE_URL}/rest/v1/attendance_stats?select=*`;
    if (month) query += `&month=eq.${month}`;
    if (year) query += `&year=eq.${year}`;

    const res = await fetch(query, { headers: getHeaders(token) });
    const data = await res.json();
    return { ok: res.ok, stats: data[0] || {}, recentAttendance: data };
  },

  // --- PLACEHOLDER FOR REMAINING ADMIN METHODS ---
  // (These can be added as you create the tables in Supabase)
  async createStudent(token, rollNumber, name, courseCodes) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ roll_number: rollNumber, name, course_code: courseCodes[0] })
    });
    return { ok: res.ok };
  }
};