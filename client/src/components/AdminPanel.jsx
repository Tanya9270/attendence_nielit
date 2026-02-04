import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const [tName, setTName] = useState(''); const [tPass, setTPass] = useState('');
  const [tCode, setTCode] = useState(''); const [tCName, setTCName] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [t, s, c] = await Promise.all([
        api.getTeachers(token), api.getStudents(token), api.getCourses(token)
      ]);
      setTeachers(t || []); setStudents(s || []); setCourses(c || []);
    } catch (err) { console.error(err); }
  }

  const notify = (type, text) => {
    setMessage({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  async function handleCreateTeacher(e) {
    e.preventDefault();
    setLoading(true);
    const res = await api.createTeacher(token, tName, tPass, tCode, tCName);
    setLoading(false);
    if (res.ok) {
      notify('success', '👨‍🏫 Teacher Successfully Registered');
      setTName(''); setTPass(''); setTCode(''); setTCName('');
      loadAll();
    } else { notify('error', res.error || 'Registration failed'); }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    setLoading(true);
    const res = await api.createStudent(token, sRoll, sName, [sCode]);
    setLoading(false);
    if (res.ok) {
      notify('success', '👨‍🎓 Student Successfully Registered');
      setSRoll(''); setSName(''); setSCode('');
      loadAll();
    } else { notify('error', res.error || 'Registration failed'); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    const res = await api.deleteUser(token, id);
    if (res.ok) { notify('success', '🗑️ User removed successfully'); loadAll(); }
  }

  return (
    <div className="container">
      {/* HEADER SECTION */}
      <div className="admin-header">
        <div>
          <h1 style={{ margin: 0, fontWeight: 900, color: 'var(--primary-blue)' }}>Faculty Management</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Control Panel • NIELIT QR System</p>
        </div>
        <div className="badge-vibrant" style={{ fontSize: '0.9rem', padding: '10px 20px' }}>
          ADMINISTRATOR ACCESS
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ borderRadius: '15px' }}>
          {message.text}
        </div>
      )}

      {/* TOP ROW: FORMS */}
      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginBottom: '40px' }}>
        
        <div className="dashboard-card" style={{ borderTop: '6px solid var(--primary-blue)' }}>
          <h2>Add New Teacher</h2>
          <form onSubmit={handleCreateTeacher}>
            <input className="modern-input" placeholder="Full Name" value={tName} onChange={e => setTName(e.target.value)} required />
            <input className="modern-input" type="password" placeholder="Account Password" value={tPass} onChange={e => setTPass(e.target.value)} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input className="modern-input" placeholder="Course Code" value={tCode} onChange={e => setTCode(e.target.value)} required />
              <input className="modern-input" placeholder="Course Name" value={tCName} onChange={e => setTCName(e.target.value)} required />
            </div>
            <button className="btn-premium btn-blue" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Processing...' : 'Register Teacher'}
            </button>
          </form>
        </div>

        <div className="dashboard-card" style={{ borderTop: '6px solid var(--success-green)' }}>
          <h2>Enroll New Student</h2>
          <form onSubmit={handleCreateStudent}>
            <input className="modern-input" placeholder="Roll Number / ID" value={sRoll} onChange={e => setSRoll(e.target.value)} required />
            <input className="modern-input" placeholder="Student Full Name" value={sName} onChange={e => setSName(e.target.value)} required />
            <select className="modern-input" value={sCode} onChange={e => setSCode(e.target.value)} required>
              <option value="">Choose Enrolled Course</option>
              {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn-premium btn-green" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Processing...' : 'Register Student'}
            </button>
          </form>
        </div>
      </div>

      {/* BOTTOM ROW: DATA LISTS */}
      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        
        <div className="dashboard-card">
          <h2>Teacher Registry</h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
            {teachers.map(t => (
              <div key={t.course_code} className="data-card" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
                <div className="item-info">
                  <strong>👨‍🏫 {t.teacher_name}</strong>
                  <span>{t.course_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                   <span className="badge-vibrant">{t.course_code}</span>
                   <button className="delete-icon-btn" onClick={() => handleDelete(t.id, t.teacher_name)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h2>Student Database</h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
            {students.map(s => (
              <div key={s.roll_number} className="data-card" style={{ borderLeft: '4px solid var(--success-green)' }}>
                <div className="item-info">
                  <strong>👨‍🎓 {s.name}</strong>
                  <span>Roll: {s.roll_number}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                   <span className="badge-vibrant" style={{ color: 'var(--success-green)', background: '#ecfdf5', borderColor: '#a7f3d0' }}>{s.course_code}</span>
                   <button className="delete-icon-btn" onClick={() => handleDelete(s.user_id, s.name)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}