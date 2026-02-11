const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MARK_FN_KEY = import.meta.env.VITE_MARK_FN_API_KEY;

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

// Helper: generate PDF blob from table data (without autoTable plugin)
async function generatePDF(title, headersRow, rows) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const lineHeight = 7;
  let yPosition = 15;

  // Add title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(title, margin, yPosition);
  yPosition += 10;

  // Add timestamp
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, yPosition);
  yPosition += 8;

  // Calculate column widths
  const colCount = headersRow.length;
  const usableWidth = pageWidth - 2 * margin;
  const colWidth = usableWidth / colCount;

  // Draw table headers
  doc.setFillColor(0, 102, 179);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);

  let xPos = margin;
  headersRow.forEach((header) => {
    doc.text(header, xPos + 2, yPosition + 4, { maxWidth: colWidth - 4, align: 'left' });
    xPos += colWidth;
  });
  yPosition += lineHeight + 2;

  // Draw table rows
  doc.setTextColor(50, 50, 50);
  doc.setFont(undefined, 'normal');
  let bgColor = false;

  rows.forEach((row) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    // Alternate row colors
    if (bgColor) {
      doc.setFillColor(245, 245, 245);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, yPosition - 3, usableWidth, lineHeight + 2, 'F');
    bgColor = !bgColor;

    // Draw grid
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPosition - 3, usableWidth, lineHeight + 2);

    xPos = margin;
    row.forEach((cell) => {
      doc.text(String(cell), xPos + 2, yPosition + 2, { maxWidth: colWidth - 4, align: 'left' });
      xPos += colWidth;
    });
    yPosition += lineHeight + 2;
  });

  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}

// Helper: generate calendar-style PDF for monthly class attendance
async function generateMonthlyCalendarPDF(title, courseCode, courseName, monthName, year, students, attendanceData, faculty = '[Faculty Name]') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  let yPosition = 8;

  // === NIELIT HEADER ===
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 102, 179);
  doc.text('NIELIT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('National Institute of Electronics & Information Technology', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  // Blue separator line
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.8);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // === TITLE ===
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Monthly Attendance Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;

  // === COURSE INFORMATION (CENTERED) ===
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 102, 179);
  doc.text(`${courseCode}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;

  doc.setFont(undefined, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(courseName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 3;

  doc.text(`Faculty: ${faculty}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  const monthMap = { 'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
                     'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12 };
  const monthNum = monthMap[monthName] || 1;
  const lastDay = new Date(year, monthNum, 0).getDate();

  // Count session days
  const sessionDays = students.length > 0 ? Object.keys(attendanceData[students[0].student_id] || {}).length : 0;

  doc.setFontSize(8);
  doc.text(
    `Month: ${monthName} ${year} | Session Days: ${sessionDays}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 4;

  doc.text(
    `Total Students: ${students.length}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 7;

  // === CALENDAR TABLE ===
  const dayWidth = (pageWidth - 2 * margin - 50) / (lastDay + 1); // +1 for P column
  const cellHeight = 4;
  let xPos = margin;

  // "Student" label header
  doc.setFillColor(150, 150, 150);
  doc.rect(margin, yPosition - cellHeight + 0.5, 50, cellHeight, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, yPosition - cellHeight + 0.5, 50, cellHeight);
  doc.setFontSize(6);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Student', margin + 2, yPosition - 1);

  // Day numbers header - always show 1-31, no OFF here
    xPos = margin + 50;
  for (let day = 1; day <= lastDay; day++) {
    // Check if this is a session day (at least one student has attendance for this day)
    const isSessionDay = students.some(s => attendanceData[s.id]?.[day.toString().padStart(2, '0')]);

    // Check if it's weekend (Saturday=6, Sunday=0)
    const dateObj = new Date(year, monthNum - 1, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    if (isWeekend) {
      doc.setFillColor(255, 200, 200); // Light red for weekends
    } else if (isSessionDay) {
      doc.setFillColor(100, 180, 100); // Green for session days
    } else {
      doc.setFillColor(200, 200, 200); // Gray for non-session days
    }

    doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight, 'F');
    doc.setDrawColor(100, 100, 100);
    doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight);

    doc.setFontSize(5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);

    // Always show day number
    doc.text(day.toString(), xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

    xPos += dayWidth;
  }

  // P column header (Present count)
  doc.setFillColor(150, 150, 150);
  doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight);
  doc.setFontSize(6);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('P', xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

  yPosition += cellHeight;

  // === STUDENT ROWS ===
  students.forEach((student, idx) => {
    if (yPosition > pageHeight - 15) {
      doc.addPage('landscape');
      yPosition = margin;

      // Redraw header on new page
      xPos = margin;
      doc.setFillColor(150, 150, 150);
      doc.rect(margin, yPosition - cellHeight + 0.5, 50, cellHeight, 'F');
      doc.setDrawColor(100, 100, 100);
      doc.rect(margin, yPosition - cellHeight + 0.5, 50, cellHeight);
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Student', margin + 2, yPosition - 1);

            xPos = margin + 50;
            for (let day = 1; day <= lastDay; day++) {
              const isSessionDay = students.some(s => attendanceData[s.id]?.[day.toString().padStart(2, '0')]);

        // Check if it's weekend (Saturday=6, Sunday=0)
        const dateObj = new Date(year, monthNum - 1, day);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

        if (isWeekend) {
          doc.setFillColor(255, 200, 200); // Light red for weekends
        } else if (isSessionDay) {
          doc.setFillColor(100, 180, 100);
        } else {
          doc.setFillColor(200, 200, 200);
        }
        doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight, 'F');
        doc.setDrawColor(100, 100, 100);
        doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight);
        doc.setFontSize(5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);

        // Always show day number
        doc.text(day.toString(), xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });
        xPos += dayWidth;
      }

      doc.setFillColor(150, 150, 150);
      doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight, 'F');
      doc.setDrawColor(100, 100, 100);
      doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight);
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('P', xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

      yPosition += cellHeight;
    }

    // Student name cell
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, yPosition - cellHeight + 0.5, 50, cellHeight, 'F');
    doc.setDrawColor(150, 150, 150);
    doc.rect(margin, yPosition - cellHeight + 0.5, 50, cellHeight);

    doc.setFontSize(6);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${student.roll_number || student.id} ${student.name}`, margin + 1, yPosition - 1);

    // Attendance cells
    xPos = margin + 50;
    let presentCount = 0;

    for (let day = 1; day <= lastDay; day++) {
      doc.setFillColor(255, 255, 255);
      doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight, 'F');
      doc.setDrawColor(150, 150, 150);
      doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight);

      // Check if weekend
      const dateObj = new Date(year, monthNum - 1, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayStr = day.toString().padStart(2, '0');
      const attendanceStatus = attendanceData[student.id]?.[dayStr];
      let cellText = '-';
      let textColor = [150, 150, 150];

      if (isWeekend) {
        cellText = 'OFF';
        textColor = [150, 150, 150];
      } else if (attendanceStatus === 'P') {
        cellText = '✓';
        textColor = [45, 125, 50]; // Green
        presentCount++;
      } else if (attendanceStatus === 'A') {
        cellText = '✗';
        textColor = [198, 40, 40]; // Red
      } else if (attendanceStatus === 'L') {
        cellText = 'L';
        textColor = [230, 81, 0]; // Orange
      }

      doc.setTextColor(...textColor);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(6);
      doc.text(cellText, xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

      xPos += dayWidth;
    }

    // Present count column
    doc.setFillColor(255, 255, 255);
    doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight, 'F');
    doc.setDrawColor(150, 150, 150);
    doc.rect(xPos, yPosition - cellHeight + 0.5, dayWidth, cellHeight);

    doc.setTextColor(0, 102, 179);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(6);
    doc.text(presentCount.toString(), xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

    yPosition += cellHeight;
  });

  // === LEGEND ===
  yPosition += 2;
  doc.setFontSize(6);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(
    "Legend: ✓ Present (with scan time) | ✗ Absent | L Leave | W Weekend | H Holiday | - No Session",
    margin,
    yPosition
  );
  yPosition += 3;

  doc.setFontSize(5);
  doc.text(
    "Note: Session Days = Days when attendance was conducted. Green column headers indicate session days.",
    margin,
    yPosition
  );

  // === FOOTER ===
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on: ${new Date().toLocaleString('en-IN')}`,
    margin,
    pageHeight - 3
  );

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
    const redirectUrl = `${window.location.origin}/reset-password`;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({
          email,
          redirectTo: redirectUrl
        })
      });

      const data = await response.json();

      // Check for rate limiting
      if (response.status === 429) {
        return {
          ok: false,
          error: 'Too many password reset requests. Please wait 15-30 minutes before trying again, or check your email for a previous reset link.'
        };
      }

      // Check both the response status and data for errors
      if (!response.ok || data.error) {
        return { ok: false, error: data.error?.message || data.message || 'Failed to send reset email' };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
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
    // ── Export: Monthly PDF (client-side generation) ───────────
  async exportMonthlyPDF(token, month, year, className, section, courseCode) {
    const data = await attApi(token, { action: 'get-monthly', month, year, course_code: courseCode });
    if (!data.ok) throw new Error('Failed to load monthly data');

    const students = data.students || [];
    const courseName = data.course_name || courseCode;
    const faculty = data.faculty || '[Faculty Name]';
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });

    // Build attendance data map: {studentId: {DD: 'P'/'A'/'L'}}
        const attendanceMap = {};
    students.forEach(student => {
      attendanceMap[student.id] = {};
      if (student.daily && Array.isArray(student.daily)) {
        student.daily.forEach((dayData, dayIdx) => {
          const dayKey = String(dayData.day).padStart(2, '0');
          if (dayData.status === 'present') {
            attendanceMap[student.id][dayKey] = 'P';
          } else if (dayData.status === 'absent') {
            attendanceMap[student.student_id][dayKey] = 'A';
          } else if (dayData.status === 'leave') {
            attendanceMap[student.student_id][dayKey] = 'L';
          }
        });
      }
    });

    console.log('Student data:', students);
    console.log('Attendance map:', attendanceMap);

    const title = `Monthly Attendance Report - ${monthName} ${year}`;
    return await generateMonthlyCalendarPDF(
      title,
      courseCode,
      courseName,
      monthName,
      year,
      students,
      attendanceMap,
      faculty
    );
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
