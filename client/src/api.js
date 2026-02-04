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
  // 1. AUTHENTICATION (Fixed for Admin Portal)
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
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=role`, {
        headers: getHeaders(authData.access_token)
      });
      const profileData = await profileRes.json();
      
      // Fallback: If no DB profile exists, but username is "admin", treat as admin
      let userRole = profileData[0]?.role;
      if (!userRole && username.toLowerCase() === 'admin') {
          userRole = 'admin';
      } else if (!userRole) {
          userRole = 'student';
      }

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

  // 2. PROFILE DATA (Added Safety Check for Admin)
  async getStudentMe(token) {
    const userString = localStorage.getItem('user');
    if (!userString) return null;
    
    const user = JSON.parse(userString);

    // FIX: If user is admin, do NOT call the student database
    if (user.role === 'admin' || !user.id) {
        console.log("Skipping student profile fetch for admin user.");
        return null;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?user_id=eq.${user.id}&select=*`, {
      headers: getHeaders(token)
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  },

  // 3. DATA FETCHING FOR PORTALS
  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=*`, {
      headers: getHeaders(token)
    });
    return res.json();
  },

  async getDailyAttendance(token, date, courseCode) {
    let url = `${SUPABASE_URL}/rest/v1/attendance?date=eq.${date}`;
    if (courseCode) url += `&course_code=eq.${courseCode}`;
    const res = await fetch(url, { headers: getHeaders(token) });
    const data = await res.json();
    return { ok: true, data: data };
  },

  // 4. ADMIN ACTIONS
  async createTeacher(token, username, password, courseCodes, courseName) {
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

  // 5. ATTENDANCE SCANNING
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