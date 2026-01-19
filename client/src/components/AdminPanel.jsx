import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel({ token }) {
  const [tUsername, setTUsername] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tCourseCode, setTCourseCode] = useState('');
  const [tCourseName, setTCourseName] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sName, setSName] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sCourse, setSCourse] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
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
      console.log('createTeacher response:', res);
      if (res.ok) {
        setMsgType('success');
        setMsg('Teacher created successfully');
        setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseName('');
        loadLists();
      } else {
        setMsgType('error');
        setMsg(res.error || 'Failed to create teacher');
      }
    } catch (err) {
      setMsgType('error');
      setMsg('Error creating teacher');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createStudent(token, sRoll, sName, sCourse, sPassword);
      console.log('createStudent response:', res);
      if (res.ok) {
        setMsgType('success');
        setMsg('Student created successfully');
        setSRoll(''); setSName(''); setSCourse(''); setSPassword('');
      } else {
        setMsgType('error');
        setMsg(res.error || 'Failed to create student');
      }
    } catch (err) {
      setMsgType('error');
      setMsg('Error creating student');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="admin-panel container">
      <div className="card">
        <h2 style={{marginBottom:16}}>Admin Panel</h2>

        <div className="columns">
          <form onSubmit={createTeacher} className="col form-card">
            <h3>Create Teacher</h3>
            <div className="form-group">
              <label>Username</label>
              <input value={tUsername} onChange={e=>setTUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={tPassword} onChange={e=>setTPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Course Code</label>
              <input value={tCourseCode} onChange={e=>setTCourseCode(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={tCourseName} onChange={e=>setTCourseName(e.target.value)} />
            </div>
            <div className="form-group">
              <button type="submit" className="btn btn-primary">Create Teacher</button>
            </div>
          </form>

          <form onSubmit={createStudent} className="col form-card">
            <h3>Create Student</h3>
            <div className="form-group">
              <label>Roll Number</label>
              <input value={sRoll} onChange={e=>setSRoll(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input value={sName} onChange={e=>setSName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={sPassword} onChange={e=>setSPassword(e.target.value)} placeholder="Leave blank to use roll number" />
            </div>
            <div className="form-group">
              <label>Course Code</label>
              <input value={sCourse} onChange={e=>setSCourse(e.target.value)} />
            </div>
            <div className="form-group">
              <button type="submit" className="btn btn-primary">Create Student</button>
            </div>
          </form>
        </div>

        {msg && (
          <div className={msgType === 'success' ? 'alert alert-success' : 'alert alert-error'} style={{marginTop:12}}>
            {msg}
          </div>
        )}

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

          <h3 style={{marginTop:12}}>Courses</h3>
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
    </div>
  );
}
