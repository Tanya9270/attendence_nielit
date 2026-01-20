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
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingStudentUsername, setEditingStudentUsername] = useState('');
  const [normalizingIds, setNormalizingIds] = useState([]);

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
      if (editingTeacherId) {
        const res = await api.updateTeacher(token, editingTeacherId, { username: tUsername, password: tPassword || undefined, course_code: tCourseCode, course_name: tCourseName });
        if (res && res.ok) {
          setMsgType('success'); setMsg('Teacher updated');
          setEditingTeacherId(null); setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseName('');
          loadLists();
        } else {
          setMsgType('error'); setMsg(res.error || 'Failed to update teacher');
        }
      } else {
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
      }
    } catch (err) {
      setMsgType('error');
      setMsg('Error creating/updating teacher');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudentId) {
        const res = await api.updateStudent(token, editingStudentId, { roll_number: sRoll, name: sName, course_code: sCourse, password: sPassword || undefined });
        if (res && res.ok) {
          setMsgType('success'); setMsg('Student updated');
          setEditingStudentId(null); setSRoll(''); setSName(''); setSCourse(''); setSPassword('');
          loadStudents();
        } else {
          setMsgType('error'); setMsg(res.error || 'Failed to update student');
        }
      } else {
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
      }
    } catch (err) {
      setMsgType('error');
      setMsg('Error creating/updating student');
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

  const normalizeStudent = async (id) => {
    if (!confirm('Normalize this student username?')) return;
    try {
      setNormalizingIds(prev => [...prev, id]);
      const res = await api.normalizeUsername(token, id);
      if (res && res.ok) {
        setMsgType('success'); setMsg('Username normalized');
        loadStudents();
      } else {
        setMsgType('error'); setMsg(res && res.error ? res.error : 'Normalization failed');
      }
    } catch (err) {
      setMsgType('error'); setMsg('Error normalizing username');
    } finally {
      setNormalizingIds(prev => prev.filter(x => x !== id));
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const startEditTeacher = (t) => {
    setEditingTeacherId(t.id);
    setTUsername(t.username || '');
    setTCourseCode(t.course_code || '');
    setTCourseName(t.course_name || '');
    setTPassword('');
  };

  const cancelEditTeacher = () => {
    setEditingTeacherId(null);
    setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseName('');
  };

  const startEditStudent = (s) => {
    setEditingStudentId(s.id);
    setSRoll(s.roll_number || '');
    setSName(s.name || '');
    setSCourse(s.course_code || '');
    setSPassword('');
    setEditingStudentUsername(s.username || '');
  };

  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setSRoll(''); setSName(''); setSCourse(''); setSPassword('');
    setEditingStudentUsername('');
  };

  const copyToClipboard = async (text) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setMsgType('success'); setMsg('Copied to clipboard');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsgType('error'); setMsg('Copy failed');
      setTimeout(() => setMsg(''), 2000);
    }
  };

  return (
    <div className="admin-panel container" style={{padding:16}}>
      <div className="card" style={{padding:20, borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.06)'}}>
        <h2 style={{marginBottom:16}}>Admin Panel</h2>

        <div className="columns" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <form onSubmit={createTeacher} className="col form-card" style={{background:'#fff',padding:12,borderRadius:6}}>
            <h3>{editingTeacherId ? 'Edit Teacher' : 'Create Teacher'}</h3>
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
            <div className="form-group" style={{display:'flex',gap:8}}>
              <button type="submit" className="btn btn-primary">{editingTeacherId ? 'Save' : 'Create Teacher'}</button>
              {editingTeacherId && <button type="button" className="btn" onClick={cancelEditTeacher}>Cancel</button>}
            </div>
          </form>

          <form onSubmit={createStudent} className="col form-card" style={{background:'#fff',padding:12,borderRadius:6}}>
            <h3>{editingStudentId ? 'Edit Student' : 'Create Student'}</h3>
            <div className="form-group">
              <label>Roll Number</label>
              <input value={sRoll} onChange={e=>setSRoll(e.target.value)} required />
            </div>
            {editingStudentId && (
              <div className="form-group" style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{flex:1}}>
                  <label>Username</label>
                  <input value={editingStudentUsername} readOnly disabled />
                </div>
                <div style={{alignSelf:'flex-end'}}>
                  <button type="button" className="btn" onClick={() => copyToClipboard(editingStudentUsername)}>Copy</button>
                </div>
              </div>
            )}
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
            <div className="form-group" style={{display:'flex',gap:8}}>
              <button type="submit" className="btn btn-primary">{editingStudentId ? 'Save' : 'Create Student'}</button>
              {editingStudentId && <button type="button" className="btn" onClick={cancelEditStudent}>Cancel</button>}
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
                <li key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0f0f0'}}>
                  <span style={{fontWeight:500}}>{t.username} {t.last_login_at ? `- last login: ${new Date(t.last_login_at).toLocaleString()}` : ''}</span>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn" onClick={() => startEditTeacher(t)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => deleteTeacher(t.id)}>Delete</button>
                  </div>
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
            <ul style={{listStyle:'none',paddingLeft:0,margin:0}}>
              {students.map(s => (
                <li key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 8px',borderBottom:'1px solid #f6f6f6'}}>
                  <div>
                    <div style={{fontWeight:600}}>{s.roll_number} - {s.name}</div>
                    <div style={{fontSize:12,color:'#666',marginTop:4}}>
                      {s.course_code ? `${s.course_code}` : ''} {s.username ? ` • ${s.username}` : ''}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {s.username && <button className="btn" onClick={() => copyToClipboard(s.username)}>Copy</button>}
                    <button className="btn" onClick={() => startEditStudent(s)}>Edit</button>
                    <button className="btn" onClick={() => normalizeStudent(s.id)} disabled={normalizingIds.includes(s.id)}>
                      {normalizingIds.includes(s.id) ? 'Normalizing...' : 'Normalize'}
                    </button>
                    <button className="btn btn-danger" onClick={() => deleteStudent(s.id)}>Delete</button>
                  </div>
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
