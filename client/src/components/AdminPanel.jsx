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

  // Form States
  const [tName, setTName] = useState(''); const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState(''); const [tCode, setTCode] = useState('');
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sCode, setSCode] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [t, s, c] = await Promise.all([api.getTeachers(token), api.getStudents(token), api.getCourses(token)]);
    setTeachers(t || []); setStudents(s || []); setCourses(c || []);
  };

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // --- FILTERING LOGIC ---
  const filteredTeachers = filterCourse === 'all' ? teachers : teachers.filter(t => t.course_code === filterCourse);
  const filteredStudents = filterCourse === 'all' ? students : students.filter(s => s.course_code === filterCourse);

  const handleCreateTeacher = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await api.createTeacher(token, tName, tEmail, tPass, tCode, tName);
    setLoading(false);
    if(res.ok) { notify('success', 'Teacher registered!'); loadData(); }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await api.createStudent(token, sName, sEmail, sRoll, sCode);
    setLoading(false);
    if(res.ok) { notify('success', 'Student enrolled!'); loadData(); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    const res = await api.deleteUser(token, id);
    if (res.ok) { notify('success', 'User Deleted'); loadData(); }
  };

  return (
    <div className="container">
      <div className="admin-header">
        <div>
          <h1 style={{ fontWeight: 900, color: 'var(--nielit-blue)', fontSize: '2rem' }}>NIELIT Admin</h1>
          <p style={{ color: '#64748b' }}>Full Management Control</p>
        </div>
        <div className="filter-bar">
          <strong style={{ fontSize: '14px', color: 'var(--nielit-blue)' }}>Filter by Course:</strong>
          <select className="modern-input" style={{ marginBottom: 0, width: '220px', padding: '8px' }} 
            value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="all">All Records</option>
            {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
          </select>
        </div>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* ADD TEACHER */}
        <div className="dashboard-card" style={{ borderTop: '8px solid var(--nielit-blue)' }}>
          <h2>Add New Teacher</h2>
          <form onSubmit={handleCreateTeacher}>
            <input className="modern-input" placeholder="Full Name" value={tName} onChange={e => setTName(e.target.value)} required />
            <input className="modern-input" placeholder="Email (for password reset)" value={tEmail} onChange={e => setTEmail(e.target.value)} required />
            <input className="modern-input" type="password" placeholder="Password" value={tPass} onChange={e => setTPass(e.target.value)} required />
            <input className="modern-input" placeholder="Course Code" value={tCode} onChange={e => setTCode(e.target.value)} required />
            <button className="btn-premium btn-blue" type="submit" disabled={loading}>Register Faculty</button>
          </form>
        </div>

        {/* ENROLL STUDENT */}
        <div className="dashboard-card" style={{ borderTop: '8px solid var(--success-green)' }}>
          <h2>Enroll Student</h2>
          <form onSubmit={handleCreateStudent}>
            <input className="modern-input" placeholder="Student Name" value={sName} onChange={e => setSName(e.target.value)} required />
            <input className="modern-input" placeholder="Student Email" value={sEmail} onChange={e => setSEmail(e.target.value)} required />
            <input className="modern-input" placeholder="Roll Number" value={sRoll} onChange={e => setSRoll(e.target.value)} required />
            <select className="modern-input" value={sCode} onChange={e => setSCode(e.target.value)} required>
              <option value="">Choose Course</option>
              {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn-premium btn-green" type="submit" disabled={loading}>Enroll Student</button>
          </form>
        </div>
      </div>

      <div className="admin-grid" style={{ marginTop: '50px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
         <div>
           <h3 style={{ marginBottom: '20px' }}>Teachers ({filteredTeachers.length})</h3>
           {filteredTeachers.map(t => (
             <div key={t.course_code} className="data-card teacher-indicator">
               <div><strong>{t.teacher_name}</strong><span>{t.course_name}</span></div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <span className="badge-vibrant">{t.course_code}</span>
                 <button className="delete-icon-btn" style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px' }} onClick={() => handleDelete(t.id, t.teacher_name)}>🗑️</button>
               </div>
             </div>
           ))}
         </div>
         <div>
           <h3 style={{ marginBottom: '20px' }}>Students ({filteredStudents.length})</h3>
           {filteredStudents.map(s => (
             <div key={s.roll_number} className="data-card student-indicator">
               <div><strong>{s.name}</strong><span>ID: {s.roll_number}</span></div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <span className="badge-vibrant" style={{ background: '#ecfdf5', color: 'var(--success-green)' }}>{s.course_code}</span>
                 <button className="delete-icon-btn" style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px' }} onClick={() => handleDelete(s.user_id, s.name)}>🗑️</button>
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
}