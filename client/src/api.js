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
  // 1. AUTH (Checks profiles table for role)
  async login(username, password) {
    const email = username.includes('@') ? username : `${username.replace(/\//g, '_')}@nielit.com`;
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
  },

  // 2. AUTOMATIC USER CREATION (Calls the new Edge Function)
  async createTeacher(token, username, password, courseCodes, courseName) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ 
        type: 'teacher', username, password, name: username, 
        course_code: Array.isArray(courseCodes) ? courseCodes[0] : courseCodes, 
        course_name: courseName 
      })
    });
    return await res.json();
  },

  async createStudent(token, rollNumber, name, courseCodes, password = "password123") {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ 
        type: 'student', username: rollNumber, name, password, 
        course_code: Array.isArray(courseCodes) ? courseCodes[0] : courseCodes 
      })
    });
    return await res.json();
  },

  // 3. GETTERS FOR LISTS
  async getTeachers(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
    return await res.json();
  },

  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, { headers: getHeaders(token) });
    return await res.json();
  },

  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, { headers: getHeaders(token) });
    return await res.json();
  },

  // 4. ATTENDANCE SCANNING
  async markMyAttendance(token, qrPayload) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    return await response.json();
  }
};