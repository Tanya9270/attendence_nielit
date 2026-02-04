import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherCourseCode, setTeacherCourseCode] = useState('');
  const [teacherCourseName, setTeacherCourseName] = useState('');

  const [studentRoll, setStudentRoll] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentCourseCode, setStudentCourseCode] = useState('');

  // Search filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Get token from localStorage
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    if (!token) return;
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

  const showStatus = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  async function handleCreateTeacher(e) {
    e.preventDefault();
    try {
      const res = await api.createTeacher(token, teacherUsername, teacherPassword, [teacherCourseCode], teacherCourseName);
      if (res.ok) {
        showStatus('success', '✅ Teacher & Course synchronized successfully!');
        setTeacherUsername(''); setTeacherPassword(''); setTeacherCourseCode(''); setTeacherCourseName('');
        await loadAll();
      } else {
        showStatus('error', '❌ Error: ' + (res.error || 'Failed to create'));
      }
    } catch (err) {
      showStatus('error', '❌ Network error');
    }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    try {
      const res = await api.createStudent(token, studentRoll, studentName, [studentCourseCode]);
      if (res.ok) {
        showStatus('success', '✅ Student account created successfully!');
        setStudentRoll(''); setStudentName(''); setStudentCourseCode('');
        await loadAll();
      } else {
        showStatus('error', '❌ Error: ' + (res.error || 'Failed to create'));
      }
    } catch (err) {
      showStatus('error', '❌ Network error');
    }
  }

  // Filter logic updated to match Supabase column names
  const filteredTeachers = teachers.filter(t =>
    (t.teacher_name || '').toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.course_code || '').toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.roll_number || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="container">
      <h1 style={{ color: 'var(--nielit-blue)', marginBottom: '20px' }}>Admin Dashboard</h1>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* CREATE FORMS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Create Teacher Form */}
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--nielit-blue)' }}>👨‍🏫 Create Teacher</h2>
          <form onSubmit={handleCreateTeacher}>
            <div className="form-group">
              <label>Username / Email Prefix</label>
              <input type="text" placeholder="e.g. cheshta" value={teacherUsername} onChange={e => setTeacherUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Set Password</label>
              <input type="password" placeholder="password" value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>Course Code</label>
                <input type="text" placeholder="JAI-001" value={teacherCourseCode} onChange={e => setTeacherCourseCode(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input type="text" placeholder="AI Tech" value={teacherCourseName} onChange={e => setTeacherCourseName(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Teacher Account</button>
          </form>
        </div>

        {/* Create Student Form */}
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--nielit-green)' }}>👨‍🎓 Create Student</h2>
          <form onSubmit={handleCreateStudent}>
            <div className="form-group">
              <label>Roll Number</label>
              <input type="text" placeholder="001/JAI/1" value={studentRoll} onChange={e => setStudentRoll(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Student Name" value={studentName} onChange={e => setStudentName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Assign Course</label>
              <select value={studentCourseCode} onChange={e => setStudentCourseCode(e.target.value)} required>
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.course_code} value={c.course_code}>{c.course_name} ({c.course_code})</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%', background: 'var(--nielit-green)' }}>Create Student Account</button>
          </form>
        </div>
      </div>

      {/* DATA LISTS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Teachers List */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>Current Faculty</h3>
          <div className="form-group">
            <input type="text" placeholder="Search teachers or courses..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
          </div>
          <div className="admin-data-list">
            {filteredTeachers.map((t) => (
              <div key={t.course_code} className="data-card">
                <div>
                  <div className="card-title">👨‍🏫 {t.teacher_name}</div>
                  <div className="card-subtitle">{t.course_name}</div>
                </div>
                <span className="course-badge">{t.course_code}</span>
              </div>
            ))}
            {filteredTeachers.length === 0 && <p className="text-center">No teachers found</p>}
          </div>
        </div>

        {/* Students Lis