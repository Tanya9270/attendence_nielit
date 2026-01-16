import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel({ token }) {
  const [tUsername, setTUsername] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tCourseCode, setTCourseCode] = useState('');
  const [tCourseName, setTCourseName] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sName, setSName] = useState('');
  const [sCourse, setSCourse] = useState('');
  const [msg, setMsg] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const t = await api.getTeachers(token);
      if (t && t.ok) setTeachers(t.teachers || []);
      const c = await api.getCourses(token);
      if (c && c.ok) setCourses(c.courses || c || []);
    } catch (err) {
      console.error('Failed to load lists', err);
    }
  };

  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createTeacher(token, tUsername, tPassword, tCourseCode, tCourseName);
      if (res.ok) {
        setMsg('Teacher created successfully');
        setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseName('');
      } else {
        setMsg(res.error || 'Failed to create teacher');
      }
    } catch (err) {
      setMsg('Error creating teacher');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createStudent(token, sRoll, sName, sCourse);
      if (res.ok) {
        setMsg('Student created successfully');
        setSRoll(''); setSName(''); setSCourse('');
      } else {
        setMsg(res.error || 'Failed to create student');
      }
    } catch (err) {
      setMsg('Error creating student');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      <div style={{display:'flex',gap:20}}>
        <form onSubmit={createTeacher} style={{minWidth:300}}>
          <h3>Create Teacher</h3>
          <div>
            <label>Username</label>
            <input value={tUsername} onChange={e=>setTUsername(e.target.value)} required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={tPassword} onChange={e=>setTPassword(e.target.value)} required />
          </div>
          <div>
            <label>Course Code (optional)</label>
            <input value={tCourseCode} onChange={e=>setTCourseCode(e.target.value)} />
          </div>
          <div>
            <label>Course Name (optional)</label>
            <input value={tCourseName} onChange={e=>setTCourseName(e.target.value)} />
          </div>
          <button type="submit">Create Teacher</button>
        </form>

        <form onSubmit={createStudent} style={{minWidth:300}}>
          <h3>Create Student</h3>
          <div>
            <label>Roll Number</label>
            <input value={sRoll} onChange={e=>setSRoll(e.target.value)} required />
          </div>
          <div>
            <label>Name</label>
            <input value={sName} onChange={e=>setSName(e.target.value)} required />
          </div>
          <div>
            <label>Course Code (optional)</label>
            <input value={sCourse} onChange={e=>setSCourse(e.target.value)} />
          </div>
          <button type="submit">Create Student</button>
        </form>
      </div>
      {msg && <div className="message">{msg}</div>}

      <div style={{ marginTop: 20 }}>
        <h3>Existing Teachers</h3>
        {teachers.length === 0 ? (
          <div>No teachers found</div>
        ) : (
          <ul>
            {teachers.map(t => (
              <li key={t.id}>{t.username} {t.last_login_at ? `- last login: ${new Date(t.last_login_at).toLocaleString()}` : ''}</li>
            ))}
          </ul>
        )}

        <h3>Courses</h3>
        {courses.length === 0 ? (
          <div>No courses found</div>
        ) : (
          <ul>
            {courses.map(c => (
              <li key={c.course_code}>{c.course_code} - {c.course_name} {c.teacher_name ? `(${c.teacher_name})` : ''}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
