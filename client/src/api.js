const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

const getHeaders = (token) => ({ 
  'Content-Type': 'application/json', 
  'apikey': SUPABASE_KEY, 
  'Authorization': `Bearer ${token}` 
});

export const api = {
  async login(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) return { ok: false };
    const prof = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role`, { headers: getHeaders(data.access_token) });
    const pData = await prof.json();
    return { ok: true, token: data.access_token, user: { id: data.user.id, email, role: pData[0]?.role || 'student' } };
  },

  async createTeacher(token, name, email, password, code, courseName) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'teacher', email, password, name, course_code: code, course_name: courseName })
    });
    return await res.json();
  },

  async createStudent(token, name, email, roll, password, code) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ type: 'student', email, roll_number: roll, name, password, course_code: code })
    });
    return await res.json();
  },

  // GET LISTS - Simplified to ensure they show up
  async getTeachers(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
    const data = await res.json();
    console.log("Teachers from DB:", data);
    return Array.isArray(data) ? data : [];
  },

  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, { headers: getHeaders(token) });
    const data = await res.json();
    console.log("Students from DB:", data);
    return Array.isArray(data) ? data : [];
  },

  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
    return await res.json();
  },

  async deleteUser(token, userId) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST', headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ action: 'delete', userId })
    });
    return await res.json();
  }
};