const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${token}`
});

export const api = {
  // NEW: Forgot Password functionality
  async forgotPassword(email) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return { ok: res.ok };
  },

  async login(username, password) {
    // If username is not email, we append the domain
    const email = username.includes('@') ? username : `${username.replace(/\//g, '_')}@nielit.com`;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error_description };

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role`, {
      headers: getHeaders(data.access_token)
    });
    const profileData = await profileRes.json();
    return { ok: true, token: data.access_token, user: { id: data.user.id, username, role: profileData[0]?.role || 'student' } };
  },

  // UPDATED: Now requires real email
  async createTeacher(token, name, email, password, code, courseName) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'teacher', username: email, password, name, course_code: code, course_name: courseName })
    });
    return { ...await res.json(), ok: res.ok };
  },

  async createStudent(token, name, email, roll, code) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'student', username: email, name, roll_number: roll, course_code: code, password: 'password123' })
    });
    return { ...await res.json(), ok: res.ok };
  },

  async getTeachers(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*,profiles!inner(id)`, { headers: getHeaders(token) });
    const data = await res.json();
    return data.map(t => ({ ...t, id: t.profiles?.id }));
  },

  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, { headers: getHeaders(token) });
    return await res.json();
  },

  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
    return await res.json();
  },

  async deleteUser(token, userId) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ action: 'delete', userId })
    });
    return { ...await res.json(), ok: res.ok };
  }
};