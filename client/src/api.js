const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

const supabaseHeaders = (token) => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${token}`
});

const serverHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

const edgeFnHeaders = (token) => ({
  ...supabaseHeaders(token),
  'x-mark-fn-api-key': MARK_FN_KEY
});

export const api = {
  // ── Auth ──────────────────────────────────────────────────
  async login(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false };
    const prof = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role`, {
      headers: supabaseHeaders(data.access_token)
    });
    const pData = await prof.json();
    return {
      ok: true,
      token: data.access_token,
      user: { id: data.user.id, email, role: pData[0]?.role || 'student' }
    };
  },

  // ── Admin: Create Teacher ─────────────────────────────────
  async createTeacher(token, name, email, password, code, courseName) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: edgeFnHeaders(token),
      body: JSON.stringify({ type: 'teacher', email, password, name, course_code: code, course_name: courseName })
    });
    return await res.json();
  },

  // ── Admin: Create Student ─────────────────────────────────
  async createStudent(token, name, email, roll, password, code) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: edgeFnHeaders(token),
      body: JSON.stringify({ type: 'student', email, roll_number: roll, name, password, course_code: code })
    });
    return await res.json();
  },

  // ── Admin: Get Teachers (via edge function - bypasses RLS) ─
  async getTeachers(token) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: edgeFnHeaders(token),
      body: JSON.stringify({ action: 'list', listType: 'teachers' })
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // ── Admin: Get Students (via edge function - bypasses RLS) ─
  async getStudents(token) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: edgeFnHeaders(token),
      body: JSON.stringify({ action: 'list', listType: 'students' })
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // ── Get Courses (via edge function - bypasses RLS) ────────
  // Returns { ok: true, courses: [...] }
  async getCourses(token) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: edgeFnHeaders(token),
      body: JSON.stringify({ action: 'list', listType: 'courses' })
    });
    return await res.json();
  },

  // ── Admin: Delete User ────────────────────────────────────
  async deleteUser(token, userId) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: edgeFnHeaders(token),
      body: JSON.stringify({ action: 'delete', userId })
    });
    return await res.json();
  },

  // ── Password Reset ────────────────────────────────────────
  async forgotPassword(email) {
    const res = await fetch(`${SERVER_URL}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  },

  async resetPassword(email, token, password) {
    const res = await fetch(`${SERVER_URL}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password })
    });
    return await res.json();
  },

  // ── Server Time (for QR sync) ─────────────────────────────
  async getServerTime() {
    const res = await fetch(`${SERVER_URL}/api/server-time`);
    return await res.json();
  },

  // ── Attendance: Daily ─────────────────────────────────────
  async getDailyAttendance(token, date, className, section, courseCode) {
    const params = new URLSearchParams({ date });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/attendance/daily?${params}`, {
      headers: serverHeaders(token)
    });
    return await res.json();
  },

  // ── Attendance: Monthly ───────────────────────────────────
  async getMonthlyAttendance(token, month, year, className, section, courseCode) {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/attendance/monthly?${params}`, {
      headers: serverHeaders(token)
    });
    return await res.json();
  },

  // ── Attendance: Finalize ──────────────────────────────────
  async finalizeAttendance(token, date, className, section, courseCode) {
    const res = await fetch(`${SERVER_URL}/api/attendance/finalize`, {
      method: 'POST',
      headers: serverHeaders(token),
      body: JSON.stringify({ date, class: className, section, course_code: courseCode })
    });
    return await res.json();
  },

  // ── Attendance: Student Self-Mark ─────────────────────────
  async markMyAttendance(token, qrPayload) {
    const res = await fetch(`${SERVER_URL}/api/attendance/mark-self`, {
      method: 'POST',
      headers: serverHeaders(token),
      body: JSON.stringify({ qr_payload: qrPayload })
    });
    return await res.json();
  },

  // ── Export: Daily PDF ─────────────────────────────────────
  async exportDailyPDF(token, date, className, section, courseCode) {
    const params = new URLSearchParams({ date });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/export/daily/pdf?${params}`, {
      headers: serverHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to generate PDF');
    return await res.blob();
  },

  // ── Export: Daily CSV ─────────────────────────────────────
  async exportDailyCSV(token, date, className, section, courseCode) {
    const params = new URLSearchParams({ date });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/export/daily/csv?${params}`, {
      headers: serverHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to generate CSV');
    return await res.blob();
  },

  // ── Export: Monthly PDF ───────────────────────────────────
  async exportMonthlyPDF(token, month, year, className, section, courseCode) {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/export/monthly/pdf?${params}`, {
      headers: serverHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to generate PDF');
    return await res.blob();
  },

  // ── Export: Monthly CSV ───────────────────────────────────
  async exportMonthlyCSV(token, month, year, className, section, courseCode) {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/export/monthly/csv?${params}`, {
      headers: serverHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to generate CSV');
    return await res.blob();
  },

  // ── Export: Legacy CSV ────────────────────────────────────
  async exportAttendance(token, date, className, section, courseCode) {
    const params = new URLSearchParams({ date });
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    if (courseCode) params.append('course_code', courseCode);
    const res = await fetch(`${SERVER_URL}/api/attendance/export?${params}`, {
      headers: serverHeaders(token)
    });
    return await res.blob();
  },

  // ── Student: Get My Profile ───────────────────────────────
  async getStudentMe(token) {
    const res = await fetch(`${SERVER_URL}/api/students/me`, {
      headers: serverHeaders(token)
    });
    return await res.json();
  },

  // ── Student: Get Attendance Stats ─────────────────────────
  async getStudentAttendanceStatsByMonth(token, month, year) {
    const params = new URLSearchParams();
    if (month) params.append('month', String(month));
    if (year) params.append('year', String(year));
    const res = await fetch(`${SERVER_URL}/api/students/me/attendance-stats?${params}`, {
      headers: serverHeaders(token)
    });
    return await res.json();
  }
};
