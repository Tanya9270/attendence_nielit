import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  // Forms
  const [tName, setTName] = useState(''); const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState(''); const [tCode, setTCode] = useState('');
  const [tCName, setTCName] = useState('');
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sPass, setSPass] = useState('');
  const [sCode, setSCode] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [t, s, c] = await Promise.all([api.getTeachers(token), api.getStudents(token), api.getCourses(token)]);
      setTeachers(Array.isArray(t) ? t : []);
      setStudents(Array.isArray(s) ? s : []);
      setCourses(Array.isArray(c) ? c : []);
    } catch (e) { console.error(e); }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await api.createTeacher(token, tName, tEmail, tPass, tCode, tCName);
    setLoading(false);
    if(res.ok) { alert("Success!"); setTName(''); setTEmail(''); setTPass(''); setTCode(''); setTCName(''); loadAll(); }
    else { alert("Error: " + res.error); }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await api.createStudent(token, sName, sEmail, sRoll, sPass, sCode);
    setLoading(false);
    if(res.ok) { alert("Success!"); setSName(''); setSEmail(''); setSRoll(''); setSPass(''); setSCode(''); loadAll(); }
    else { alert("Error: " + res.error); }
  };

  const filteredTeachers = filter === 'all' ? teachers : teachers.filter(t => t.course_code === filter);
  const filteredStudents = filter === 'all' ? students : students.filter(s => s.course_code === filter);

  return (
    <div className="container">
      <div className="header">
        <h1>Admin Control</h1>
        <div className="filter-box">
          <label>View: </label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3>Add Teacher</h3>
          <form onSubmit={handleCreateTeacher}>
            <input placeholder="Teacher Name" value={tName} onChange={e => setTName(e.target.value)} required />
            <input placeholder="Email" value={tEmail} onChange={e => setTEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={tPass} onChange={e => setTPass(e.target.value)} required />
            <input placeholder="Course Code" value={tCode} onChange={e => setTCode(e.target.value)} required />
            <input placeholder="Course Name" value={tCName} onChange={e => setTCName(e.target.value)} required />
            <button className="btn btn-blue" disabled={loading}>Register Teacher</button>
          </form>
        </div>

        <div className="card">
          <h3>Enroll Student</h3>
          <form onSubmit={handleCreateStudent}>
            <input placeholder="Student Name" value={sName} onChange={e => setSName(e.target.value)} required />
            <input placeholder="Email" value={sEmail} onChange={e => setSEmail(e.target.value)} required />
            <input placeholder="Roll Number" value={sRoll} onChange={e => setSRoll(e.target.value)} required />
            <input type="password" placeholder="Password" value={sPass} onChange={e => setSPass(e.target.value)} required />
            <select value={sCode} onChange={e => setSCode(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
            </select>
            <button className="btn btn-green" disabled={loading}>Enroll Student</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        <div>
          <h4>Faculty List ({filteredTeachers.length})</h4>
          {filteredTeachers.map(t => (
            <div key={t.course_code} className="data-card teacher-indicator">
              <div><strong>{t.teacher_name}</strong><br/><small>{t.course_name} ({t.course_code})</small></div>
            </div>
          ))}
        </div>
        <div>
          <h4>Students ({filteredStudents.length})</h4>
          {filteredStudents.map(s => (
            <div key={s.roll_number} className="data-card student-indicator">
              <div><strong>{s.name}</strong><br/><small>ID: {s.roll_number}</small></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}