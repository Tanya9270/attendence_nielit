import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel({ token }) {
  const [tUsername, setTUsername] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tCourseCode, setTCourseCode] = useState('');
  const [tCourseCodes, setTCourseCodes] = useState([]);
  const [tCourseName, setTCourseName] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sName, setSName] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sCourse, setSCourse] = useState('');
  const [sCourseCodes, setSCourseCodes] = useState([]);
  const [tNewCourseInput, setTNewCourseInput] = useState('');
  const [sNewCourseInput, setSNewCourseInput] = useState('');
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
      setMsgType('error'); setMsg('Failed to load teacher/course lists');
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const loadStudents = async () => {
    try {
      const s = await api.getStudents(token);
      if (s) setStudents(s || []);
    } catch (err) {
      console.error('Failed to load students', err);
      setMsgType('error'); setMsg('Failed to load students');
      setTimeout(() => setMsg(''), 4000);
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
        const res = await api.updateTeacher(token, editingTeacherId, { username: tUsername, password: tPassword || undefined, course_codes: tCourseCodes, course_name: tCourseName });
        if (res && res.ok) {
          setMsgType('success'); setMsg('Teacher updated');
          setEditingTeacherId(null); setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseName('');
          loadLists();
        } else {
          setMsgType('error'); setMsg(res.error || 'Failed to update teacher');
        }
      } else {
        const res = await api.createTeacher(token, tUsername, tPassword, (tCourseCodes && tCourseCodes[0]) || tCourseCode || '', tCourseName);
        if (res && res.ok) {
          setMsgType('success');
          setMsg('Teacher created successfully');
          setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseCodes([]); setTCourseName('');
          loadLists();
        } else {
          setMsgType('error');
          setMsg(res && res.error ? res.error : 'Failed to create teacher');
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
        const res = await api.updateStudent(token, editingStudentId, { roll_number: sRoll, name: sName, course_codes: sCourseCodes, password: sPassword || undefined });
        if (res && res.ok) {
          setMsgType('success'); setMsg('Student updated');
          setEditingStudentId(null); setSRoll(''); setSName(''); setSCourse(''); setSPassword('');
          setSCourseCodes([]);
          loadStudents();
        } else {
          setMsgType('error'); setMsg(res.error || 'Failed to update student');
        }
      } else {
        const res = await api.createStudent(token, sRoll, sName, sCourseCodes, sPassword);
        if (res && res.ok) {
          setMsgType('success');
          setMsg('Student created successfully');
          setSRoll(''); setSName(''); setSCourse(''); setSCourseCodes([]); setSPassword('');
          loadStudents();
        } else {
          setMsgType('error');
          setMsg(res && res.error ? res.error : 'Failed to create student');
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
    setTCourseCodes(t.course_codes || (t.course_code ? [t.course_code] : []));
    setTCourseName(t.course_name || '');
    setTPassword('');
  };

  const cancelEditTeacher = () => {
    setEditingTeacherId(null);
    setTUsername(''); setTPassword(''); setTCourseCode(''); setTCourseCodes([]); setTCourseName('');
  };

  const startEditStudent = (s) => {
    setEditingStudentId(s.id);
    setSRoll(s.roll_number || '');
    setSName(s.name || '');
    setSCourse(s.course_code || '');
    setSCourseCodes(s.course_codes || (s.course_code ? [s.course_code] : []));
    setSPassword('');
    setEditingStudentUsername(s.username || '');
  };

  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setSRoll(''); setSName(''); setSCourse(''); setSCourseCodes([]); setSPassword('');
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

  const styles = {
    container: { padding: 28, maxWidth: 1200, margin: '0 auto', fontFamily: "'Segoe UI', Roboto, Arial, sans-serif", color: '#233' },
    header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
    title: { fontSize: 28, fontWeight: 700, color: '#0b5ed7' },
    subtitle: { color: '#5a6b83' },
    card: { background: '#ffffff', padding: 20, borderRadius: 10, boxShadow: '0 8px 20px rgba(18,38,63,0.06)', marginBottom: 16 },
    cols: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18 },
    formRow: { display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' },
    label: { width: 120, color: '#33475b', fontWeight: 600 },
    input: { padding: 10, borderRadius: 8, border: '1px solid #d7e0ea', width: '100%', boxShadow: 'inset 0 1px 2px rgba(16,24,40,0.03)' },
    select: { padding: 10, borderRadius: 8, border: '1px solid #d7e0ea', width: '100%', background: '#fff' },
    btnPrimary: { padding: '10px 14px', background: '#0b5ed7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
    btnGhost: { padding: '8px 12px', background: '#f6f9fc', color: '#123', border: '1px solid #e6eef6', borderRadius: 8, cursor: 'pointer' },
    smallMuted: { fontSize: 12, color: '#7b8794' },
    tableHeader: { background: '#f0f6ff', color: '#0b5ed7', fontWeight: 700 }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Admin Portal</div>
        <div style={styles.subtitle}>Manage teachers · students · courses</div>
        <div style={{ marginLeft: 'auto' }}>
          <button style={styles.btnGhost} onClick={() => { loadLists(); loadStudents(); }}>Refresh Data</button>
        </div>
      </div>

      {msg && (
        <div style={{ ...styles.card, background: msgType === 'success' ? '#f0fff4' : '#fff4f4', border: msgType === 'success' ? '1px solid #d1f3d8' : '1px solid #f5c6cb' }}>
          {msg}
        </div>
      )}

      <div style={styles.cols}>
        <div>
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, color: '#16325c' }}>Add / Edit Teacher</h2>
            <form onSubmit={createTeacher}>
              <div style={styles.formRow}>
                <label style={styles.label}>Username</label>
                <input style={styles.input} value={tUsername} onChange={e => setTUsername(e.target.value)} required />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Password</label>
                <input type="password" style={styles.input} value={tPassword} onChange={e => setTPassword(e.target.value)} required />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Course</label>
                <input style={styles.input} value={tCourseName} onChange={e => setTCourseName(e.target.value)} placeholder="Course name (optional)" />
              </div>

              <div style={{ ...styles.formRow, alignItems: 'flex-start' }}>
                <label style={styles.label}>Course Codes</label>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select style={styles.select} value={(tCourseCodes && tCourseCodes[0]) || ''} onChange={e => { const v = e.target.value; if (!v) return; setTCourseCodes([v]); }}>
                      <option value="">-- select existing course --</option>
                      {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_code}{c.course_name ? ` - ${c.course_name}` : ''}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={styles.input} placeholder="Add new code" value={tNewCourseInput} onChange={e => setTNewCourseInput(e.target.value)} />
                    <button type="button" style={styles.btnGhost} onClick={() => { const v = (tNewCourseInput || '').trim(); if (!v) return; setTCourseCodes([v]); setTNewCourseInput(''); }}>Add</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="submit" style={styles.btnPrimary}>{editingTeacherId ? 'Save Changes' : 'Create Teacher'}</button>
                {editingTeacherId && <button type="button" style={styles.btnGhost} onClick={cancelEditTeacher}>Cancel</button>}
                <div style={{ marginLeft: 'auto', ...styles.smallMuted }}>Records are stored in the application backend.</div>
              </div>
            </form>
          </div>

          <div style={{ ...styles.card, marginTop: 14 }}>
            <h2 style={{ marginTop: 0, color: '#16325c' }}>Add / Edit Student</h2>
            <form onSubmit={createStudent}>
              <div style={styles.formRow}>
                <label style={styles.label}>Roll</label>
                <input style={styles.input} value={sRoll} onChange={e => setSRoll(e.target.value)} required />
              </div>

              {editingStudentId && (
                <div style={styles.formRow}>
                  <label style={styles.label}>Username</label>
                  <input style={{ ...styles.input, background: '#f8fafc' }} value={editingStudentUsername} readOnly disabled />
                  <button type="button" style={styles.btnGhost} onClick={() => copyToClipboard(editingStudentUsername)}>Copy</button>
                </div>
              )}

              <div style={styles.formRow}>
                <label style={styles.label}>Name</label>
                <input style={styles.input} value={sName} onChange={e => setSName(e.target.value)} required />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Password</label>
                <input type="password" style={styles.input} value={sPassword} onChange={e => setSPassword(e.target.value)} placeholder="Leave blank to use roll" />
              </div>

              <div style={{ ...styles.formRow, alignItems: 'flex-start' }}>
                <label style={styles.label}>Course Codes</label>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {(sCourseCodes || []).map(cc => (
                      <div key={cc} style={{ background: '#eef6ff', padding: '6px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ color: '#0b5ed7' }}>{cc}</strong>
                        <button type="button" className="btn" style={styles.btnGhost} onClick={() => setSCourseCodes(prev => prev.filter(x => x !== cc))}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select style={{ ...styles.select, flex: 1 }} value={''} onChange={e => { const v = e.target.value; if (!v) return; if (!sCourseCodes.includes(v)) setSCourseCodes(prev => [...prev, v]); e.target.value = ''; }}>
                      <option value="">-- add from existing courses --</option>
                      {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_code}{c.course_name ? ` - ${c.course_name}` : ''}</option>)}
                    </select>
                    <input style={{ ...styles.input, width: 160 }} placeholder="Add new code" value={sNewCourseInput} onChange={e => setSNewCourseInput(e.target.value)} onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); const v = (sNewCourseInput || '').trim(); if (!v) return; if (!sCourseCodes.includes(v)) setSCourseCodes(prev => [...prev, v]); setSNewCourseInput(''); }
                    }} />
                    <button type="button" style={styles.btnGhost} onClick={() => { const v = (sNewCourseInput || '').trim(); if (!v) return; if (!sCourseCodes.includes(v)) setSCourseCodes(prev => [...prev, v]); setSNewCourseInput(''); }}>Add</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="submit" style={styles.btnPrimary}>{editingStudentId ? 'Save Student' : 'Create Student'}</button>
                {editingStudentId && <button type="button" style={styles.btnGhost} onClick={cancelEditStudent}>Cancel</button>}
                <div style={{ marginLeft: 'auto', ...styles.smallMuted }}>Tip: Student username is generated by the server.</div>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div style={{ ...styles.card }}>
            <h3 style={{ marginTop: 0, color: '#16325c' }}>Quick Lists</h3>

            <div style={{ marginBottom: 10 }}>
              <input style={styles.input} placeholder="Search teachers..." value={teacherQuery} onChange={e => setTeacherQuery(e.target.value)} />
            </div>
            <div style={{ maxHeight: 220, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Username</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Course</th>
                    <th style={{ padding: 8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.filter(t => (t.username || '').toLowerCase().includes(teacherQuery.toLowerCase())).map(t => (
                    <tr key={t.id} style={{ borderTop: '1px solid #f1f5fa' }}>
                      <td style={{ padding: 8, fontWeight: 700, color: '#0b5ed7' }}>{t.username}</td>
                      <td style={{ padding: 8 }}>{t.course_codes && t.course_codes.length ? t.course_codes.join(', ') : (t.course_code || '-')}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        <button className="btn" style={styles.btnGhost} onClick={() => startEditTeacher(t)}>Edit</button>
                        <button className="btn" style={{ ...styles.btnGhost, marginLeft: 8 }} onClick={() => deleteTeacher(t.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12 }}>
              <input style={styles.input} placeholder="Search students..." value={studentQuery} onChange={e => setStudentQuery(e.target.value)} />
            </div>

            <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Roll</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                    <th style={{ padding: 8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => {
                    const q = studentQuery.toLowerCase();
                    return !q || (s.roll_number || '').toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q);
                  }).map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid #f1f5fa' }}>
                      <td style={{ padding: 8, fontWeight: 700, color: '#0b5ed7' }}>{s.roll_number}</td>
                      <td style={{ padding: 8 }}>{s.name}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {s.username && <button className="btn" style={styles.btnGhost} onClick={() => copyToClipboard(s.username)}>Copy</button>}
                        <button className="btn" style={{ ...styles.btnGhost, marginLeft: 8 }} onClick={() => startEditStudent(s)}>Edit</button>
                        <button className="btn" style={{ ...styles.btnGhost, marginLeft: 8 }} onClick={() => normalizeStudent(s.id)} disabled={normalizingIds.includes(s.id)}>{normalizingIds.includes(s.id) ? 'Normalizing...' : 'Normalize'}</button>
                        <button className="btn" style={{ ...styles.btnGhost, marginLeft: 8, background: '#fff4f4' }} onClick={() => deleteStudent(s.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
