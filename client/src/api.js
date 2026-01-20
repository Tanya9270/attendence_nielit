// For online classes: Set VITE_API_URL environment variable to your ngrok backend URL
// Example: VITE_API_URL=https://abc123.ngrok-free.app/api npm run dev
// For local: keep as '/api' (uses Vite proxy)

// Set API base URL: use env, else production, else local proxy
// Prefer explicit environment override. When not provided, use local proxy `/api` for dev.
let API_BASE_URL = import.meta.env.VITE_API_URL || '';

if (API_BASE_URL) {
  // Normalize: ensure API_BASE_URL does not end with a slash, and always include the `/api` prefix.
  API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');
  if (!API_BASE_URL.endsWith('/api')) API_BASE_URL = API_BASE_URL + '/api';
} else {
  // Use Vite dev server proxy or same-origin API in production
  API_BASE_URL = '/api';
}

if (!API_BASE_URL.startsWith('http') && !API_BASE_URL.startsWith('/api')) {
  console.warn('Warning: API_BASE_URL may be misconfigured:', API_BASE_URL);
}

console.log('API Base URL:', API_BASE_URL);

export const api = {
  async login(username, password) {
    try {
      console.log('API: Calling login endpoint...');
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      console.log('API: Response status:', response.status);
      const data = await response.json();
      console.log('API: Response data:', data);
      return data;
    } catch (err) {
      console.error('API: Login fetch error:', err);
      throw err;
    }
  },

  async getServerTime() {
    const response = await fetch(`${API_BASE_URL}/server-time`);
    return response.json();
  },

  async getStudentMe(token) {
    const response = await fetch(`${API_BASE_URL}/students/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async getStudentAttendanceStats(token) {
    const response = await fetch(`${API_BASE_URL}/students/me/attendance-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async getStudents(token, className = '', section = '') {
    let url = `${API_BASE_URL}/students?`;
    if (className) url += `class=${className}&`;
    if (section) url += `section=${section}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async scanQR(token, qrPayload, sessionId = null) {
    const response = await fetch(`${API_BASE_URL}/attendance/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ qr_payload: qrPayload, teacher_session_id: sessionId })
    });
    return response.json();
  },

  async getDailyAttendance(token, date = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/attendance/daily?`;
    if (date) url += `date=${date}&`;
    if (courseCode) url += `course_code=${courseCode}&`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async finalizeAttendance(token, date, className = '', section = '', courseCode = '') {
    const response = await fetch(`${API_BASE_URL}/attendance/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ date, course_code: courseCode })
    });
    return response.json();
  },

  async exportAttendance(token, date = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/attendance/export?`;
    if (date) url += `date=${date}&`;
    if (courseCode) url += `course_code=${courseCode}&`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    return blob;
  },

  // Student marks their own attendance by scanning teacher's QR
  async markMyAttendance(token, qrPayload) {
    const response = await fetch(`${API_BASE_URL}/attendance/mark-self`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    return response.json();
  },

  // Get monthly attendance report for teachers
  async getMonthlyAttendance(token, month = '', year = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/attendance/monthly?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    if (courseCode) url += `course_code=${courseCode}&`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  // Get student attendance stats with month filter
  async getStudentAttendanceStatsByMonth(token, month = '', year = '') {
    let url = `${API_BASE_URL}/students/me/attendance-stats?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  // Export Daily attendance as PDF
  async exportDailyPDF(token, date = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/export/daily/pdf?`;
    if (date) url += `date=${date}&`;
    if (className) url += `class=${className}&`;
    if (section) url += `section=${section}&`;
    if (courseCode) url += `course_code=${courseCode}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(errorData.error || 'Export failed');
    }
    return response.blob();
  },

  // Export Daily attendance as CSV
  async exportDailyCSV(token, date = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/export/daily/csv?`;
    if (date) url += `date=${date}&`;
    if (className) url += `class=${className}&`;
    if (section) url += `section=${section}&`;
    if (courseCode) url += `course_code=${courseCode}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(errorData.error || 'Export failed');
    }
    return response.blob();
  },

  // Export Monthly attendance as PDF
  async exportMonthlyPDF(token, month = '', year = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/export/monthly/pdf?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    if (className) url += `class=${className}&`;
    if (section) url += `section=${section}&`;
    if (courseCode) url += `course_code=${courseCode}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(errorData.error || 'Export failed');
    }
    return response.blob();
  },

  // Export Monthly attendance as CSV
  async exportMonthlyCSV(token, month = '', year = '', className = '', section = '', courseCode = '') {
    let url = `${API_BASE_URL}/export/monthly/csv?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    if (className) url += `class=${className}&`;
    if (section) url += `section=${section}&`;
    if (courseCode) url += `course_code=${courseCode}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  async changePassword(token, oldPassword, newPassword) {
    const response = await fetch(`${API_BASE_URL}/users/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    return response.json();
  },

  async createTeacher(token, username, password, courseCode = '', courseName = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, course_code: courseCode, course_name: courseName })
      });

      // Try parsing JSON, but fall back to text for HTML/error pages
      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text().catch(() => '');
        const errMsg = text || response.statusText || `HTTP ${response.status}`;
        console.error('createTeacher non-JSON response', response.status, errMsg);
        return { ok: false, error: errMsg, status: response.status, raw: text };
      }

      if (!response.ok) {
        const errMsg = data && data.error ? data.error : (data || response.statusText || `HTTP ${response.status}`);
        console.error('createTeacher error response', response.status, errMsg, data);
        return { ok: false, error: errMsg, status: response.status, raw: data };
      }

      return data;
    } catch (err) {
      return { ok: false, error: err.message || 'network_error' };
    }
  },

  async createStudent(token, rollNumber, name, courseCode = '', password = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roll_number: rollNumber, name, course_code: courseCode, password })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text().catch(() => '');
        const errMsg = text || response.statusText || `HTTP ${response.status}`;
        console.error('createStudent non-JSON response', response.status, errMsg);
        return { ok: false, error: errMsg, status: response.status, raw: text };
      }

      if (!response.ok) {
        const errMsg = data && data.error ? data.error : (data || response.statusText || `HTTP ${response.status}`);
        console.error('createStudent error response', response.status, errMsg, data);
        return { ok: false, error: errMsg, status: response.status, raw: data };
      }

      return data;
    } catch (err) {
      return { ok: false, error: err.message || 'network_error' };
    }
  },

  // Get all teachers (admin)
  async getTeachers(token) {
    const response = await fetch(`${API_BASE_URL}/admin/teachers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async updateTeacher(token, teacherId, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      let data;
      try { data = await response.json(); } catch (e) { data = { ok: response.ok, status: response.status }; }
      return data;
    } catch (err) {
      return { ok: false, error: err.message || 'network_error' };
    }
  },

  async deleteTeacher(token, teacherId) {
    const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async deleteStudent(token, studentId) {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },
  async updateStudent(token, studentId, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      let data;
      try { data = await response.json(); } catch (e) { data = { ok: response.ok, status: response.status }; }
      return data;
    } catch (err) {
      return { ok: false, error: err.message || 'network_error' };
    }
  },
  async deleteCourse(token, courseCode) {
    const response = await fetch(`${API_BASE_URL}/export/courses/${encodeURIComponent(courseCode)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  // Get all courses
  async getCourses(token) {
    const response = await fetch(`${API_BASE_URL}/export/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};
