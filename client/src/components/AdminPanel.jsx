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
  const [teacherQuery, setTeacherQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [courseQuery, setCourseQuery] = useState('');
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input placeholder="Search teachers..." value={teacherQuery} onChange={e => setTeacherQuery(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #ddd',flex:1}} />
            <button className="btn" onClick={loadLists}>Refresh</button>
          </div>
          {teachers.filter(t => (t.username || '').toLowerCase().includes(teacherQuery.toLowerCase())).length === 0 ? (
            <div>No teachers found</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Last Login</th>
                  <th>Course</th>
                  <th style={{width:180}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.filter(t => (t.username || '').toLowerCase().includes(teacherQuery.toLowerCase())).map(t => (
                  <tr key={t.id}>
                    <td style={{fontWeight:600}}>{t.username}</td>
                    <td>{t.last_login_at ? new Date(t.last_login_at).toLocaleString() : '-'}</td>
                    <td>{t.course_code ? `${t.course_code} ${t.course_name ? '- ' + t.course_name : ''}` : '-'}</td>
                    <td>
                      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                        <button className="btn" onClick={() => startEditTeacher(t)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => deleteTeacher(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{marginTop:12}}>Students</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input placeholder="Search students (roll, name, username)..." value={studentQuery} onChange={e => setStudentQuery(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #ddd',flex:1}} />
            <button className="btn" onClick={loadStudents}>Load Students</button>
          </div>
          {students.filter(s => {
            const q = studentQuery.toLowerCase();
            return (
              !q || (s.roll_number || '').toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q)
            );
          }).length === 0 ? (
            <div>No students found</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Username</th>
                  <th style={{width:260}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.filter(s => {
                  const q = studentQuery.toLowerCase();
                  return (
                    !q || (s.roll_number || '').toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q)
                  );
                }).map(s => (
                  <tr key={s.id}>
                    <td style={{fontWeight:600}}>{s.roll_number}</td>
                    <td>{s.name}</td>
                    <td>{s.course_code || '-'}</td>
                    <td>{s.username || '-'}</td>
                    <td>
                      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                        {s.username && <button className="btn" onClick={() => copyToClipboard(s.username)}>Copy</button>}
                        <button className="btn" onClick={() => startEditStudent(s)}>Edit</button>
                        <button className="btn" onClick={() => normalizeStudent(s.id)} disabled={normalizingIds.includes(s.id)}>
                          {normalizingIds.includes(s.id) ? 'Normalizing...' : 'Normalize'}
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteStudent(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 16 }}>
            <h3>Courses</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input placeholder="Search courses..." value={courseQuery} onChange={e => setCourseQuery(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #ddd',flex:1}} />
            </div>
            {courses.filter(c => (c.course_code || '').toLowerCase().includes(courseQuery.toLowerCase()) || (c.course_name || '').toLowerCase().includes(courseQuery.toLowerCase())).length === 0 ? (
              <div>No courses found</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Teacher</th>
                    <th style={{width:180}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.filter(c => (c.course_code || '').toLowerCase().includes(courseQuery.toLowerCase()) || (c.course_name || '').toLowerCase().includes(courseQuery.toLowerCase())).map(c => (
                    <tr key={c.course_code}>
                      <td style={{fontWeight:600}}>{c.course_code}</td>
                      <td>{c.course_name}</td>
                      <td>{c.teacher_name || '-'}</td>
                      <td>
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn" onClick={() => { setTCourseCode(c.course_code); setTCourseName(c.course_name); }}>Edit</button>
                          <button className="btn btn-danger" onClick={() => deleteCourse(c.course_code)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
