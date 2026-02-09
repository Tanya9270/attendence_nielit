const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

// Import jsPDF and autoTable at module level
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const headers = (token) => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${token}`
});

const edgeFn = (token) => ({
  ...headers(token),
  'x-mark-fn-api-key': MARK_FN_KEY
});

// Helper: call the attendance-api edge function
async function attApi(token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/attendance-api`, {
    method: 'POST',
    headers: edgeFn(token),
    body: JSON.stringify(body)
  });
  return await res.json();
}

// Helper: call the manage-users edge function
async function usersApi(token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    headers: edgeFn(token),
    body: JSON.stringify(body)
  });
  return await res.json();
}

// Helper: get current user from localStorage
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

// Helper: generate CSV blob from data
function generateCSV(headersRow, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headersRow.map(escape).join(',')];
  rows.forEach(r => lines.push(r.map(escape).join(',')));
  return new Blob([lines.join('\n')], { type: 'text/csv' });
}

// Helper: generate PDF blob from table data
async function generatePDF(title, headersRow, rows) {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Add timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);

  // Add table
  const tableData = rows.map(row => row);

  doc.autoTable({
    head: [headersRow],
    body: tableData,
    startY: 30,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 102, 179],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      textColor: 50,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 30 }
  });

  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}

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
      headers: headers(data.access_token)
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
    return usersApi(token, { type: 'teacher', email, password, name, course_code: code, course_name: courseName });
  },

  // ── Admin: Create Student ─────────────────────────────────
  async createStudent(token, name, email, roll, password, code) {
    return usersApi(token, { type: 'student', email, roll_number: roll, name, password, course_code: code });
  },

  // ── Admin: Get Teachers ───────────────────────────────────
  async getTeachers(token) {
    const data = await usersApi(token, { action: 'list', listType: 'teachers' });
    return Array.isArray(data) ? data : [];
  },

  // ── Admin: Get Students ───────────────────────────────────
  async getStudents(token) {
    const data = await usersApi(token, { action: 'list', listType: 'students' });
    return Array.isArray(data) ? data : [];
  },

  // ── Get Courses ───────────────────────────────────────────
  async getCourses(token) {
    const user = getCurrentUser();
    if (user.role === 'teacher') {
      return attApi(token, { action: 'get-courses', teacher_id: user.id });
    }
    return usersApi(token, { action: 'list', listType: 'courses' });
  },

  // ── Admin: Delete User (generic) ────────────────────────
  async deleteUser(token, userId) {
    return usersApi(token, { action: 'delete', userId });
  },

  // ── Admin: Delete Teacher (by teacher_id or course_code) ─
  async deleteTeacher(token, teacherId, courseCode) {
    if (teacherId) {
      return usersApi(token, { action: 'delete', deleteType: 'teacher', userId: teacherId });
    }
    // Fallback: delete by course_code when teacher_id is null
    return usersApi(token, { action: 'delete', courseCode });
  },

  // ── Admin: Delete Student (by student id) ─────────────────
  async deleteStudent(token, studentId, userId) {
    return usersApi(token, { action: 'delete', deleteType: 'student', studentId, userId });
  },

  // ── Password Reset ────────────────────────────────────────
  async forgotPassword(email) {
    const { error } = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email })
    }).then(r => r.json());
    return { ok: !error, error: error?.message };
  },

  async resetPassword(email, token, password) {
    // Supabase handles password reset via the recovery flow
    return { ok: true, message: 'Use the link sent to your email' };
  },

  // ── Server Time (for QR sync) ─────────────────────────────
  async getServerTime() {
    return attApi('', { action: 'server-time' });
  },

  // ── Attendance: Daily ─────────────────────────────────────
  async getDailyAttendance(token, date, className, section, courseCode) {
    return attApi(token, { action: 'get-daily', date, course_code: courseCode });
  },

  // ── Attendance: Monthly ───────────────────────────────────
  async getMonthlyAttendance(token, month, year, className, section, courseCode) {
    return attApi(token, { action: 'get-monthly', month, year, course_code: courseCode });
  },

  // ── Attendance: Finalize ──────────────────────────────────
  async finalizeAttendance(token, date, className, section, courseCode) {
    return attApi(token, { action: 'finalize', date, course_code: courseCode });
  },

  // ── Attendance: Student Self-Mark ─────────────────────────
  async markMyAttendance(token, qrPayload) {
    const user = getCurrentUser();
    return attApi(token, { action: 'mark-self', qr_payload: qrPayload, student_user_id: user.id });
  },

  // ── Export: Daily PDF (client-side generation) ────────────
  async exportDailyPDF(token, date, className, section, courseCode) {
    const data = await attApi(token, { action: 'get-daily', date, course_code: courseCode });
    if (!data.ok) throw new Error('Failed to load attendance data');

    const students = data.students || [];
    const hdrs = ['S.No', 'Roll Number', 'Name', 'Course', 'Status', 'Scan Time'];
    const rows = students.map((s, i) => [
      i + 1,
      s.roll_number,
      s.name,
      s.course_code,
      s.status,
      s.scan_time ? new Date(s.scan_time).toLocaleTimeString('en-IN') : '-'
    ]);
    const title = `Daily Attendance Report - ${date}`;
    return await generatePDF(title, hdrs, rows);
  },

  // ── Export: Daily CSV ─────────────────────────────────────
  async exportDailyCSV(token, date, className, section, courseCode) {
    const data = await attApi(token, { action: 'get-daily', date, course_code: courseCode });
    if (!data.ok) throw new Error('Failed to load attendance data');

    const students = data.students || [];
    const hdrs = ['S.No', 'Roll Number', 'Name', 'Course', 'Status', 'Scan Time'];
    const rows = students.map((s, i) => [
      i + 1,
      s.roll_number,
      s.name,
      s.course_code,
      s.status,
      s.scan_time ? new Date(s.scan_time).toLocaleTimeString('en-IN') : '-'
    ]);
    return generateCSV(hdrs, rows);
  },

  // ── Export: Monthly PDF (client-side generation) ───────────
  async exportMonthlyPDF(token, month, year, className, section, courseCode) {
    const data = await attApi(token, { action: 'get-monthly', month, year, course_code: courseCode });
    if (!data.ok) throw new Error('Failed to load monthly data');

    const students = data.students || [];
    const hdrs = ['S.No', 'Roll Number', 'Name', 'Present', 'Absent', 'Percentage'];
    const rows = students.map((s, i) => [
      i + 1,
      s.roll_number,
      s.name,
      s.present,
      s.absent,
      s.percentage + '%'
    ]);
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const title = `Monthly Attendance Report - ${monthName}`;
    return await generatePDF(title, hdrs, rows);
  },

  // ── Export: Monthly CSV ───────────────────────────────────
  async exportMonthlyCSV(token, month, year, className, section, courseCode) {
    const data = await attApi(token, { action: 'get-monthly', month, year, course_code: courseCode });
    if (!data.ok) throw new Error('Failed to load monthly data');

    const students = data.students || [];
    const hdrs = ['S.No', 'Roll Number', 'Name', 'Present', 'Absent', 'Percentage'];
    const rows = students.map((s, i) => [
      i + 1,
      s.roll_number,
      s.name,
      s.present,
      s.absent,
      s.percentage + '%'
    ]);
    return generateCSV(hdrs, rows);
  },

  // ── Export: Legacy CSV ────────────────────────────────────
  async exportAttendance(token, date, className, section, courseCode) {
    return this.exportDailyCSV(token, date, className, section, courseCode);
  },

  // ── Student: Get My Profile ───────────────────────────────
  async getStudentMe(token) {
    const user = getCurrentUser();
    return attApi(token, { action: 'student-me', user_id: user.id });
  },

  // ── Student: Get Attendance Stats ─────────────────────────
  async getStudentAttendanceStatsByMonth(token, month, year) {
    const user = getCurrentUser();
    return attApi(token, { action: 'student-stats', user_id: user.id, month, year });
  }
};
