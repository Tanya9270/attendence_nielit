import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  // Form States
  const [tName, setTName] = useState(''); const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState(''); const [tCode, setTCode] = useState('');
  const [tCourseName, setTCourseName] = useState('');
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState(''); const [sPass, setSPass] = useState('');
  const [sCode, setSCode] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [t, s, c] = await Promise.all([api.getTeachers(token), api.getStudents(token), api.getCourses(token)]);
    setTeachers(t); setStudents(s); setCourses(c);
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await api.createTeacher(token, tName, tEmail, tPass, tCode, tCourseName);
    setLoading(false);
    if(res.ok) { alert("Teacher Added Successfully"); setTName(''); setTEmail(''); setTPass(''); setTCode(''); setTCourseName(''); loadAll(); }
    else { alert("Error: " + res.error); }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await api.createStudent(token, sName, sEmail, sRoll, sPass, sCode);
    setLoading(false);
    if(res.ok) { alert("Student Enrolled Successfully"); setSName(''); setSEmail(''); setSRoll(''); setSPass(''); setSCode(''); loadAll(); }
    else { alert("Error: " + res.error); }
  };

  const filteredTeachers = filter === 'all' ? teachers : teachers.filter(t => t.course_code === filter);
  const filteredStudents = filter === 'all' ? students : students.filter(s => s.course_code === filter);

  return (
    <div className="container">
      <div className="header">
        <h1>Admin Control Panel</h1>
        <div className="filter-box">
          <label>Filter View: </label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Records</option>
            {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        {/* TEACHER FORM */}
        <div className="card" style={{ borderTop: '5px solid var(--nielit-blue)' }}>
          <h2>Add New Faculty</h2>
          <form onSubmit={handleCreateTeacher}>
            <div className="form-group"><label>Name</label><input value={tName} onChange={e => setTName(e.target.value)} required /></div>
            <div className="form-group"><label>Email</label><input value={tEmail} onChange={e => setTEmail(e.target.value)} required /></div>
            <div className="form-group"><label>Assign Password</label><input type="password" value={tPass} onChange={e => setTPass(e.target.value)} required /></div>
            <div style={{ display: 'flex', gap: '10px' }}>
               <div className="form-group"><label>Course Code</label><input value={tCode} onChange={e => setTCode(e.target.value)} required /></div>
               <div className="form-group" style={{ flex: 2 }}><label>Course Name</label><input value={tCourseName} onChange={e => setTCourseName(e.target.value)} required /></div>
            </div>
            <button className="btn btn-blue" disabled={loading}>{loading ? 'Registering...' : 'Register Teacher'}</button>
          </form>
        </div>

        {/* STUDENT FORM */}
        <div className="card" style={{ borderTop: '5px solid var(--success-green)' }}>
          <h2>Enroll Student</h2>
          <form onSubmit={handleCreateStudent}>
            <div className="form-group"><label>Full Name</label><input value={sName} onChange={e => setSName(e.target.value)} required /></div>
            <div className="form-group"><label>Email</label><input value={sEmail} onChange={e => setSEmail(e.target.value)} required /></div>
            <div style={{ display: 'flex', gap: '10px' }}>
               <div className="form-group"><label>Roll Number</label><input value={sRoll} onChange={e => setSRoll(e.target.value)} required /></div>
               <div className="form-group"><label>Password</label><input type="password" value={sPass} onChange={e => setSPass(e.target.value)} required /></div>
            </div>
            <div className="form-group">
              <label>Select Course</label>
              <select value={sCode} onChange={e => setSCode(e.target.value)} required>
                <option value="">-- Choose Course --</option>
                {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_name}</option>)}
              </select>
            </div>
            <button className="btn btn-green" disabled={loading}>Enroll Student</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '30px' }}>
        <div>
          <h3>Faculty Registry ({filteredTeachers.length})</h3>
          {filteredTeachers.map(t => (
            <div key={t.course_code} className="data-card teacher-indicator">
              <div><strong>{t.teacher_name}</strong><br/><small>{t.course_name} ({t.course_code})</small></div>
              <button className="btn-danger" onClick={async () => { if(window.confirm('Delete?')) { await api.deleteUser(token, t.id); loadAll(); } }}>Delete</button>
            </div>
          ))}
        </div>
        <div>
          <h3>Student Database ({filteredStudents.length})</h3>
          {filteredStudents.map(s => (
            <div key={s.roll_number} className="data-card student-indicator">
              <div><strong>{s.name}</strong><br/><small>ID: {s.roll_number} • {s.course_code}</small></div>
              <button className="btn-danger" onClick={async () => { if(window.confirm('Delete?')) { await api.deleteUser(token, s.user_id); loadAll(); } }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}