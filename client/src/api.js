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
  // 1. AUTHENTICATION (Fixed to get real database role)
  async login(username, password) {
    try {
      const email = username.includes('@') ? username : `${username.replace(/\//g, '_')}@nielit.com`;
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password })
      });
      const authData = await res.json();
      if (!res.ok) return { ok: false, error: authData.error_description || 'invalid_credentials' };

      // FETCH REAL ROLE FROM DB
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=role`, {
        headers: getHeaders(authData.access_token)
      });
      const profileData = await profileRes.json();
      let userRole = profileData[0]?.role || (username.toLowerCase() === 'admin' ? 'admin' : 'student');

      return { ok: true, token: authData.access_token, user: { id: authData.user.id, username, role: userRole } };
    } catch (err) {
      console.error('Login error:', err);
      return { ok: false, error: 'network_error' };
    }
  },

  // 2. AUTOMATIC USER CREATION (Fixed: returning .ok so UI shows green success)
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
    const data = await res.json();
    return { ...data, ok: res.ok }; // This ensures the UI alert is "Success"
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
    const data = await res.json();
    return { ...data, ok: res.ok }; // This ensures the UI alert is "Success"
  },

  // 3. DATA LISTS FOR ADMIN PANEL
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

  // 4. STUDENT PORTAL DATA (Fixed safety check to prevent 400 errors for admin)
  async getStudentMe(token) {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    
    // Safety check: Admin doesn't have a record in students table
    if (!user.id || user.role === 'admin') return null;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?user_id=eq.${user.id}&select=*`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  },

  // 5. ATTENDANCE LOGIC
  async markMyAttendance(token, qrPayload) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { ...getHeaders(token), 'x-mark-fn-api-key': MARK_FN_KEY },
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    const data = await response.json();
    return { ...data, ok: response.ok };
  },

  async getDailyAttendance(token, date, courseCode) {
    let url = `${SUPABASE_URL}/rest/v1/attendance?date=eq.${date}`;
    if (courseCode) url += `&course_code=eq.${courseCode}`;
    const res = await fetch(url, { headers: getHeaders(token) });
    const data = await res.json();
    return { ok: res.ok, data: data };
  }
};