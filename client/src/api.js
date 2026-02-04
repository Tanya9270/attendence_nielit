const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const api = {
  // 1. AUTHENTICATION (Database-backed Roles)
  async login(username, password) {
    try {
      const email = username.includes('@') ? username : `${username}@nielit.com`;

      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const authData = await res.json();
      if (!res.ok) return { ok: false, error: authData.error_description || 'invalid_credentials' };

      // FETCH THE REAL ROLE FROM THE PROFILES TABLE
      // This stops the "Swati" login issue by checking the actual database role
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=role`, {
        headers: getHeaders(authData.access_token)
      });
      const profileData = await profileRes.json();
      const userRole = profileData[0]?.role || 'student';

      return {
        ok: true,
        token: authData.access_token,
        user: { 
          id: authData.user.id, 
          username, 
          role: userRole 
        }
      };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  },

  // 2. PROFILE DATA (Filtered by Logged-in User ID)
  async getStudentMe(token) {
    // We must filter by the user's ID so you don't see "Swati" if you aren't Swati
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?user_id=eq.${user.id}&select=*`, {
      headers: getHeaders(token)
    });
    const data = await res.json();
    return data[0];
  },

  // 3. ADMIN ACTIONS (Restricted to Admin Role)
  async createTeacher(token, username, password, courseCodes, courseName) {
    // This adds the course and assigns the teacher name
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ 
        course_code: courseCodes[0], 
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
        course_code: courseCodes[0] 
      })
    });
    return { ok: res.ok };
  },

  // 4. ATTENDANCE & COURSES
  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, {
      headers: getHeaders(token)
    });
    return res.json();
  },

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
    const data = await response.json();
    return { ...data, ok: response.ok };
  }
};