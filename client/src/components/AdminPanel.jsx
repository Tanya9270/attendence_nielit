import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tName, setTName] = useState(''); const [tPass, setTPass] = useState('');
  const [tCode, setTCode] = useState(''); const [tCName, setTCName] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const t = await api.getTeachers(token); setTeachers(t);
    const s = await api.getStudents(token); setStudents(s);
    const c = await api.getCourses(token); setCourses(c);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete ${name}?`)) return;
    const res = await api.deleteUser(token, id);
    if (res.ok) { setMessage({ type: 'success', text: 'Deleted' }); loadAll(); }
  }

  async function handleCreateTeacher(e) {
    e.preventDefault();
    const res = await api.createTeacher(token, tName, tPass, tCode, tCName);
    if (res.ok) { setMessage({ type: 'success', text: 'Teacher Created' }); loadAll(); }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    const res = await api.createStudent(token, sRoll, sName, [sCode]);
    if (res.ok) { setMessage({ type: 'success', text: 'Student Created' }); loadAll(); }
  }

  return (
    <div className="container">
      <h1>Admin Panel</h1>
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h2>Create Teacher</h2>
          <form onSubmit={handleCreateTeacher}>
            <input placeholder="Username" value={tName} onChange={e => setTName(e.target.value)} required />
            <input type="password" placeholder="Password" value={tPass} onChange={e => setTPass(e.target.value)} required />
            <input placeholder="Course Code" value={tCode} onChange={e => setTCode(e.target.value)} required />
            <input placeholder="Course Name" value={tCName} onChange={e => setTCName(e.target.value)} required />
            <button className="btn btn-primary" type="submit">Create</button>
          </form>
        </div>

        <div className="card">
          <h2>Create Student</h2>
          <form onSubmit={handleCreateStudent}>
            <input placeholder="Roll Number" value={sRoll} onChange={e => setSRoll(e.target.value)} required />
            <input placeholder="Name" value={sName} onChange={e => setSName(e.target.value)} required />
            <select value={sCode} onChange={e => setSCode(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn btn-success" type="submit">Create</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        <div>
          <h3>Teachers</h3>
          {teachers.map(t => (
            <div key={t.course_code} className="data-card">
              <div><strong>{t.teacher_name}</strong><br/><small>{t.course_name}</small></div>
              <button onClick={() => handleDelete(t.id, t.teacher_name)} style={{ color: 'red' }}>Delete</button>
            </div>
          ))}
        </div>
        <div>
          <h3>Students</h3>
          {students.map(s => (
            <div key={s.roll_number} className="data-card student-card">
              <div><strong>{s.name}</strong><br/><small>{s.roll_number}</small></div>
              <button onClick={() => handleDelete(s.user_id, s.name)} style={{ color: 'red' }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}