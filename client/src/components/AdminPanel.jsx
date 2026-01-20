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
  const [students, setStudents] = useState([]);

  useEffect(() => {
    loadLists();
    loadStudents();
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

  const loadStudents = async () => {
    try {
      const s = await api.getStudents(token);
      if (s) setStudents(s || []);
    } catch (err) {
      console.error('Failed to load students', err);
    }
  };

  const deleteCourse = async (code) => {
    if (!confirm('Delete this course? This will unset course for enrolled students.')) return;
    try {
      const res = await api.deleteCourse(token, code);
      if (res && res.ok) loadLists();
      else setMsg('Failed to delete course');
    } catch (err) {
      setMsg('Error deleting course');
    }
    setTimeout(() => setMsg(''), 3000);
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
        loadStudents();
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

  const deleteTeacher = async (id) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      const res = await api.deleteTeacher(token, id);
      if (res && res.ok) loadLists();
      else setMsg('Failed to delete teacher');
    } catch (err) {
      setMsg('Error deleting teacher');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const deleteStudent = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      const res = await api.deleteStudent(token, id);
      if (res && res.ok) loadStudents();
      else setMsg('Failed to delete student');
    } catch (err) {
      setMsg('Error deleting student');
    }
    setTimeout(() => setMsg(''), 3000);
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
                <li key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{t.username} {t.last_login_at ? `- last login: ${new Date(t.last_login_at).toLocaleString()}` : ''}</span>
                  <button className="btn btn-danger" onClick={() => deleteTeacher(t.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}

          <h3 style={{marginTop:12}}>Students</h3>
          <div style={{ marginBottom: 8 }}>
            <button className="btn" onClick={loadStudents}>Load Students</button>
          </div>
          {students.length === 0 ? (
            <div>No students loaded</div>
          ) : (
            <ul>
              {students.map(s => (
                <li key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{s.roll_number} - {s.name} {s.course_code ? `(${s.course_code})` : ''}</span>
                  <button className="btn btn-danger" onClick={() => deleteStudent(s.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 16 }}>
            <h3>Courses</h3>
            {courses.length === 0 ? (
              <div>No courses found</div>
            ) : (
              <ul>
                {courses.map(c => (
                  <li key={c.course_code} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span>{c.course_code} - {c.course_name} {c.teacher_name ? `(${c.teacher_name})` : ''}</span>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn" onClick={() => { setTCourseCode(c.course_code); setTCourseName(c.course_name); }}>Edit</button>
                      <button className="btn btn-danger" onClick={() => deleteCourse(c.course_code)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
