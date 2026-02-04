// client/src/components/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../api';

const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function AdminPanel() {
  const [token, setToken] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  // Teacher form
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherCourseCode, setTeacherCourseCode] = useState('');
  const [teacherCourseName, setTeacherCourseName] = useState('');

  // Student form
  const [studentRoll, setStudentRoll] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentCourseCode, setStudentCourseCode] = useState('');

  // Search filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const t = await api.getTeachers(token);
      const s = await api.getStudents(token);
      const c = await api.getCourses(token);
      setTeachers(Array.isArray(t) ? t : []);
      setStudents(Array.isArray(s) ? s : []);
      setCourses(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error('loadAll error', err);
    }
  }

  async function handleCreateTeacher(e) {
    e.preventDefault();
    try {
      const res = await api.createTeacher(token, teacherUsername, teacherPassword, teacherCourseCode, teacherCourseName);
      if (res.ok) {
        setTeacherUsername('');
        setTeacherPassword('');
        setTeacherCourseCode('');
        setTeacherCourseName('');
        await loadAll();
      } else {
        console.error('createTeacher failed', res);
        alert(`Create teacher failed: ${res.status || 'error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while creating teacher');
    }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    try {
      const res = await api.createStudent(token, studentRoll, studentName, [studentCourseCode]);
      if (res.ok) {
        setStudentRoll('');
        setStudentName('');
        setStudentCourseCode('');
        await loadAll();
      } else {
        console.error('createStudent failed', res);
        alert(`Create student failed: ${res.status || 'error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while creating student');
    }
  }

  const filteredTeachers = teachers.filter(t =>
    (t.username || '').toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    (s.name || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial' }}>
      <h1>Admin Panel</h1>

      <section style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1, padding: 12, border: '1px solid #e2e2e2', borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Create Teacher</h2>
          <form onSubmit={handleCreateTeacher}>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="teacher-username">Username</label>
              <input
                id="teacher-username"
                name="teacherUsername"
                type="text"
                placeholder="e.g. john.doe"
                value={teacherUsername}
                onChange={e => setTeacherUsername(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label htmlFor="teacher-password">Password</label>
              <input
                id="teacher-password"
                name="teacherPassword"
                type="password"
                placeholder="password"
                value={teacherPassword}
                onChange={e => setTeacherPassword(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label htmlFor="teacher-course-code">Course Code</label>
              <input
                id="teacher-course-code"
                name="teacherCourseCode"
                type="text"
                placeholder="COURSE101"
                value={teacherCourseCode}
                onChange={e => setTeacherCourseCode(e.target.value)}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label htmlFor="teacher-course-name">Course Name</label>
              <input
                id="teacher-course-name"
                name="teacherCourseName"
                type="text"
                placeholder="Course name"
                value={teacherCourseName}
                onChange={e => setTeacherCourseName(e.target.value)}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>

            <button type="submit" style={{ padding: '8px 12px' }}>Create Teacher</button>
          </form>
        </div>

        <div style={{ flex: 1, padding: 12, border: '1px solid #e2e2e2', borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Create Student</h2>
          <form onSubmit={handleCreateStudent}>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="student-roll">Roll Number</label>
              <input
                id="student-roll"
                name="studentRoll"
                type="text"
                placeholder="Roll number"
                value={studentRoll}
                onChange={e => setStudentRoll(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label htmlFor="student-name">Name</label>
              <input
                id="student-name"
                name="studentName"
                type="text"
                placeholder="Full name"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label htmlFor="student-course">Course</label>
              <select
                id="student-course"
                name="studentCourseCode"
                value={studentCourseCode}
                onChange={e => setStudentCourseCode(e.target.value)}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              >
                <option value="">Select course (optional)</option>
                {courses.map(c => (
                  <option key={c.code ?? c.id} value={c.code ?? c.id}>
                    {c.name ?? c.course_name ?? c.code}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" style={{ padding: '8px 12px' }}>Create Student</button>
          </form>
        </div>
      </section>

      <section style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h3>Teachers</h3>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="teacher-search" style={srOnly}>Search teachers</label>
            <input
              id="teacher-search"
              name="teacherSearch"
              placeholder="Search teachers..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filteredTeachers.map(t => (
              <li key={t.id || t.username} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div><strong>{t.username}</strong></div>
                <div style={{ color: '#666' }}>{t.course_name ?? t.course_code}</div>
              </li>
            ))}
            {filteredTeachers.length === 0 && <li style={{ color: '#666' }}>No teachers found</li>}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Students</h3>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="student-search" style={srOnly}>Search students</label>
            <input
              id="student-search"
              name="studentSearch"
              placeholder="Search students..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filteredStudents.map(s => (
              <li key={s.id || s.roll_number} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div><strong>{s.name}</strong></div>
                <div style={{ color: '#666' }}>{s.roll_number} • {s.course_code}</div>
              </li>
            ))}
            {filteredStudents.length === 0 && <li style={{ color: '#666' }}>No students found</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}