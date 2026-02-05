import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filterCourse, setFilterCourse] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const [tName, setTName] = useState(''); const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState(''); const [tCode, setTCode] = useState('');
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sPass, setSPass] = useState('');
  const [sCode, setSCode] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [t, s, c] = await Promise.all([api.getTeachers(token), api.getStudents(token), api.getCourses(token)]);
    setTeachers(t); setStudents(s); setCourses(c);
  };

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const filteredTeachers = filterCourse === 'all' ? teachers : teachers.filter(t => t.course_code === filterCourse);
  const filteredStudents = filterCourse === 'all' ? students : students.filter(s => s.course_code === filterCourse);

  return (
    <div className="container">
      <div className="admin-header">
        <div><h1>NIELIT Admin Portal</h1><p>Vibrant Management System</p></div>
        <div className="filter-bar">
          <strong>Course Filter:</strong>
          <select className="modern-input" style={{ marginBottom: 0, width: '200px' }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="all">All Records</option>
            {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
          </select>
        </div>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="admin-grid">
        <div className="dashboard-card" style={{ borderTop: '8px solid var(--nielit-blue)' }}>
          <h2>Add Teacher</h2>
          <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); const res = await api.createTeacher(token, tName, tEmail, tPass, tCode); setLoading(false); if(res.ok) { notify('success', 'Added!'); loadData(); } }}>
            <input className="modern-input" placeholder="Name" value={tName} onChange={e => setTName(e.target.value)} required />
            <input className="modern-input" placeholder="Email" value={tEmail} onChange={e => setTEmail(e.target.value)} required />
            <input className="modern-input" type="password" placeholder="Password" value={tPass} onChange={e => setTPass(e.target.value)} required />
            <input className="modern-input" placeholder="Course Code" value={tCode} onChange={e => setTCode(e.target.value)} required />
            <button className="btn-premium btn-blue" type="submit" disabled={loading}>Register</button>
          </form>
        </div>

        <div className="dashboard-card" style={{ borderTop: '8px solid var(--success-green)' }}>
          <h2>Enroll Student</h2>
          <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); const res = await api.createStudent(token, sName, sEmail, sRoll, sPass, sCode); setLoading(false); if(res.ok) { notify('success', 'Enrolled!'); loadData(); } }}>
            <input className="modern-input" placeholder="Name" value={sName} onChange={e => setSName(e.target.value)} required />
            <input className="modern-input" placeholder="Email" value={sEmail} onChange={e => setSEmail(e.target.value)} required />
            <input className="modern-input" placeholder="Roll Number" value={sRoll} onChange={e => setSRoll(e.target.value)} required />
            <input className="modern-input" type="password" placeholder="Password" value={sPass} onChange={e => setSPass(e.target.value)} required />
            <select className="modern-input" value={sCode} onChange={e => setSCode(e.target.value)} required>
              <option value="">Choose Course</option>
              {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn-premium btn-green" type="submit" disabled={loading}>Enroll</button>
          </form>
        </div>
      </div>

      <div className="admin-grid" style={{ marginTop: '40px' }}>
        <div className="dashboard-card">
          <h3>Teachers ({filteredTeachers.length})</h3>
          {filteredTeachers.map(t => (
            <div key={t.course_code} className="data-card teacher-indicator">
              <div><strong>{t.teacher_name}</strong><span>{t.course_code}</span></div>
              <button className="delete-icon-btn" onClick={async () => { if(window.confirm('Delete?')) { const res = await api.deleteUser(token, t.id); if(res.ok) loadData(); } }}>🗑️</button>
            </div>
          ))}
        </div>
        <div className="dashboard-card">
          <h3>Students ({filteredStudents.length})</h3>
          {filteredStudents.map(s => (
            <div key={s.roll_number} className="data-card student-indicator">
              <div><strong>{s.name}</strong><span>{s.roll_number}</span></div>
              <button className="delete-icon-btn" onClick={async () => { if(window.confirm('Delete?')) { const res = await api.deleteUser(token, s.user_id); if(res.ok) loadData(); } }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}