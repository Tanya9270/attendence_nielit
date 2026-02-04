const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

// Standard headers helper
const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${token}`
});

export const api = {
  // 1. LOGIN
  async login(username, password) {
    try {
      const email = username.includes('@') ? username : `${username.replace(/\//g, '_')}@nielit.com`;
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error_description };

      // Fetch role from profiles table
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role`, {
        headers: getHeaders(data.access_token)
      });
      const profileData = await profileRes.json();
      
      return {
        ok: true,
        token: data.access_token,
        user: { id: data.user.id, username, role: profileData[0]?.role || 'student' }
      };
    } catch (err) {
      return { ok: false, error: 'Connection failed' };
    }
  },

  // 2. CREATE TEACHER/STUDENT (Calls Edge Function)
  async createTeacher(token, username, password, code, name) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'teacher', username, password, course_code: code, course_name: name })
    });
    const data = await res.json();
    return { ...data, ok: res.ok };
  },

  async createStudent(token, roll, name, code) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'student', username: roll, name, course_code: Array.isArray(code) ? code[0] : code, password: 'password123' })
    });
    const data = await res.json();
    return { ...data, ok: res.ok };
  },

  // 3. DELETE USER
  async deleteUser(token, userId) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ action: 'delete', userId })
    });
    const data = await res.json();
    return { ...data, ok: res.ok };
  },

  // 4. GET LISTS (Simplified to prevent 400 Errors)
  async getTeachers(token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
      const data = await res.json();
      // Ensure we return an array even if the database is empty or errors
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  },

  async getStudents(token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, { headers: getHeaders(token) });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  },

  async getCourses(token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  },

  async getStudentMe(token) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?user_id=eq.${user.id}&select=*`, {
      headers: getHeaders(token)
    });
    const data = await res.json();
    return data[0] || null;
  }
};