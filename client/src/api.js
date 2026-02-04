const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

const getHeaders = (token = null) => {
  const headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const api = {
  // 1. AUTHENTICATION
  async login(username, password) {
    try {
      const email = username.includes('@') ? username : `${username}@nielit.com`;
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password })
      });
      const authData = await res.json();
      if (!res.ok) return { ok: false, error: 'invalid_credentials' };

      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=role`, {
        headers: getHeaders(authData.access_token)
      });
      const profileData = await profileRes.json();
      let userRole = profileData[0]?.role || (username.toLowerCase() === 'admin' ? 'admin' : 'student');

      return { ok: true, token: authData.access_token, user: { id: authData.user.id, username, role: userRole } };
    } catch (err) { return { ok: false, error: 'network_error' }; }
  },

  // 2. GET LISTS (Fixes the "not a function" errors)
  async getTeachers(token) {
    // We fetch users from the profiles table where role is teacher
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?role=eq.teacher&select=*`, {
      headers: getHeaders(token)
    });
    return await res.json();
  },

  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
      headers: getHeaders(token)
    });
    return await res.json();
  },

  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, {
      headers: getHeaders(token)
    });
    return await res.json();
  },

  // 3. ADMIN ACTIONS (Creating data)
  async createTeacher(token, username, password, courseCodes, courseName) {
    // In Supabase, you usually create the Auth user first. 
    // This function will at least save the record to your courses table.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ 
        course_code: courseCodes[0] || courseCodes, 
        course_name: courseName, 
        teacher_name: username 
      })
    });
    return { ok: res.ok };
  },

  async createStudent(token, rollNumber, name, courseCodes) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ 
        roll_number: rollNumber, 
        name: name, 
        course_code: Array.isArray(courseCodes) ? courseCodes[0] : courseCodes 
      })
    });
    return { ok: res.ok };
  },

  // 4. STUDENT/TEACHER SPECIFIC
  async getStudentMe(token) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin' || !user.id) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?user_id=eq.${user.id}&select=*`, {
      headers: getHeaders(token)
    });
    const data = await res.json();
    return data[0] || null;
  },

  async markMyAttendance(token, qrPayload) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    return await response.json();
  }
};