import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const [tName, setTName] = useState(''); const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState(''); const [tCode, setTCode] = useState('');
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sPass, setSPass] = useState('');
  const [sCode, setSCode] = useState('');

  useEffect(() => { loadAll(); }, []);
  const loadAll = async () => {
    const [t, s, c] = await Promise.all([api.getTeachers(token), api.getStudents(token), api.getCourses(token)]);
    setTeachers(t); setStudents(s); setCourses(c);
  };

  const filteredTeachers = filter === 'all' ? teachers : teachers.filter(t => t.course_code === filter);
  const filteredStudents = filter === 'all' ? students : students.filter(s => s.course_code === filter);

  return (
    <div className="container">
      <div className="header">
        <h1>NIELIT Admin</h1>
        <div className="filter-box">
          <label>Filter by Course: </label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h2>Add Teacher</h2>
          <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); await api.createTeacher(token, tName, tEmail, tPass, tCode); setLoading(false); loadAll(); }}>
            <div className="form-group"><input placeholder="Name" value={tName} onChange={e => setTName(e.target.value)} required /></div>
            <div className="form-group"><input placeholder="Email" value={tEmail} onChange={e => setTEmail(e.target.value)} required /></div>
            <div className="form-group"><input type="password" placeholder="Password" value={tPass} onChange={e => setTPass(e.target.value)} required /></div>
            <div className="form-group"><input placeholder="Course Code" value={tCode} onChange={e => setTCode(e.target.value)} required /></div>
            <button className="btn btn-blue" disabled={loading}>Register</button>
          </form>
        </div>

        <div className="card">
          <h2>Enroll Student</h2>
          <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); await api.createStudent(token, sName, sEmail, sRoll, sPass, sCode); setLoading(false); loadAll(); }}>
            <div className="form-group"><input placeholder="Name" value={sName} onChange={e => setSName(e.target.value)} required /></div>
            <div className="form-group"><input placeholder="Email" value={sEmail} onChange={e => setSEmail(e.target.value)} required /></div>
            <div className="form-group"><input placeholder="Roll Number" value={sRoll} onChange={e => setSRoll(e.target.value)} required /></div>
            <div className="form-group"><input type="password" placeholder="Password" value={sPass} onChange={e => setSPass(e.target.value)} required /></div>
            <select value={sCode} onChange={e => setSCode(e.target.value)} required className="modern-input">
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn btn-green" disabled={loading}>Enroll</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div>
          <h3>Teachers ({filteredTeachers.length})</h3>
          {filteredTeachers.map(t => (
            <div key={t.course_code} className="data-card teacher-indicator">
              <div><strong>{t.teacher_name}</strong><br/><small>{t.course_code}</small></div>
              <button className="btn-danger" onClick={async () => { if(window.confirm('Delete?')) { await api.deleteUser(token, t.id); loadAll(); } }}>Delete</button>
            </div>
          ))}
        </div>
        <div>
          <h3>Students ({filteredStudents.length})</h3>
          {filteredStudents.map(s => (
            <div key={s.roll_number} className="data-card student-indicator">
              <div><strong>{s.name}</strong><br/><small>{s.roll_number}</small></div>
              <button className="btn-danger" onClick={async () => { if(window.confirm('Delete?')) { await api.deleteUser(token, s.user_id); loadAll(); } }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}