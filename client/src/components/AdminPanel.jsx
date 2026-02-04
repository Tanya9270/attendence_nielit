import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // Form states
  const [tName, setTName] = useState(''); const [tPass, setTPass] = useState('');
  const [tCode, setTCode] = useState(''); const [tCName, setTCName] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [t, s, c] = await Promise.all([
        api.getTeachers(token),
        api.getStudents(token),
        api.getCourses(token)
      ]);
      setTeachers(t || []);
      setStudents(s || []);
      setCourses(c || []);
    } catch (err) { console.error(err); }
  }

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  async function handleCreateTeacher(e) {
    e.preventDefault();
    setLoading(true);
    const res = await api.createTeacher(token, tName, tPass, tCode, tCName);
    setLoading(false);
    if (res.ok) {
      notify('success', '👨‍🏫 Teacher added and course assigned!');
      setTName(''); setTPass(''); setTCode(''); setTCName('');
      loadAll();
    } else { notify('error', res.error || 'Failed to create teacher'); }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    setLoading(true);
    const res = await api.createStudent(token, sRoll, sName, [sCode]);
    setLoading(false);
    if (res.ok) {
      notify('success', '👨‍🎓 Student account created successfully!');
      setSRoll(''); setSName(''); setSCode('');
      loadAll();
    } else { notify('error', res.error || 'Failed to create student'); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Permanently delete ${name}?`)) return;
    const res = await api.deleteUser(token, id);
    if (res.ok) {
      notify('success', '🗑️ User removed from system');
      loadAll();
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'var(--nielit-blue)', margin: 0 }}>System Administration</h1>
        <div className="badge-course">Admin Mode Active</div>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="admin-grid">
        {/* CREATE TEACHER CARD */}
        <div className="dashboard-card">
          <h2><span>👨‍🏫</span> Add New Faculty</h2>
          <form onSubmit={handleCreateTeacher}>
            <input className="modern-input" placeholder="Teacher Username" value={tName} onChange={e => setTName(e.target.value)} required />
            <input className="modern-input" type="password" placeholder="Assign Password" value={tPass} onChange={e => setTPass(e.target.value)} required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input className="modern-input" placeholder="Code (e.g. AI-01)" value={tCode} onChange={e => setTCode(e.target.value)} required />
              <input className="modern-input" placeholder="Course Name" value={tCName} onChange={e => setTCName(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Processing...' : 'Register Teacher'}
            </button>
          </form>
        </div>

        {/* CREATE STUDENT CARD */}
        <div className="dashboard-card">
          <h2><span>👨‍🎓</span> Register Student</h2>
          <form onSubmit={handleCreateStudent}>
            <input className="modern-input" placeholder="Roll Number (ID)" value={sRoll} onChange={e => setSRoll(e.target.value)} required />
            <input className="modern-input" placeholder="Full Student Name" value={sName} onChange={e => setSName(e.target.value)} required />
            <select className="modern-input" value={sCode} onChange={e => setSCode(e.target.value)} required>
              <option value="">Select Enrolled Course</option>
              {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn btn-success" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Processing...' : 'Register Student'}
            </button>
          </form>
        </div>
      </div>

      <div className="admin-grid">
        {/* TEACHER LIST */}
        <div className="dashboard-card">
          <h2>Faculty List</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
            {teachers.map(t => (
              <div key={t.course_code} className="data-card teacher-strip">
                <div>
                  <div className="card-title">{t.teacher_name}</div>
                  <div className="card-subtitle">{t.course_name} ({t.course_code})</div>
                </div>
                <button className="delete-btn" onClick={() => handleDelete(t.id, t.teacher_name)}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* STUDENT LIST */}
        <div className="dashboard-card">
          <h2>Student Records</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
            {students.map(s => (
              <div key={s.roll_number} className="data-card student-strip">
                <div>
                  <div className="card-title">{s.name}</div>
                  <div className="card-subtitle">ID: {s.roll_number} • {s.course_code}</div>
                </div>
                <button className="delete-btn" onClick={() => handleDelete(s.user_id, s.name)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}