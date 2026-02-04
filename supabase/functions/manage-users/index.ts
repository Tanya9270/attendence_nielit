const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

const getHeaders = (token) => ({ 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` });

export const api = {
  async login(username, password) {
    const email = username.includes('@') ? username : `${username.replace(/\//g, '_')}@nielit.com`;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false };

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role`, { headers: getHeaders(data.access_token) });
    const profileData = await profileRes.json();
    return { ok: true, token: data.access_token, user: { id: data.user.id, username, role: profileData[0]?.role || 'student' } };
  },

  async createTeacher(token, username, password, code, name) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST', headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'teacher', username, password, course_code: code, course_name: name })
    });
    return { ...await res.json(), ok: res.ok };
  },

  async createStudent(token, roll, name, code) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST', headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'student', username: roll, name, course_code: code[0], password: 'password123' })
    });
    return { ...await res.json(), ok: res.ok };
  },

  async deleteUser(token, userId) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST', headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ action: 'delete', userId })
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
  }
};