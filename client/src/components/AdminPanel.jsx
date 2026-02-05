import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Navigation from './Navigation';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const token = localStorage.getItem('token');

  // Forms
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState('');
  const [tCode, setTCode] = useState('');
  const [tCName, setTCName] = useState('');
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sPass, setSPass] = useState('');
  const [sCode, setSCode] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [t, s, c] = await Promise.all([
        api.getTeachers(token),
        api.getStudents(token),
        api.getCourses(token)
      ]);
      setTeachers(Array.isArray(t) ? t : []);
      setStudents(Array.isArray(s) ? s : []);
      setCourses(Array.isArray(c) ? c : []);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to load data');
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    const res = await api.createTeacher(token, tName, tEmail, tPass, tCode, tCName);
    setLoading(false);
    if (res.ok) {
      setSuccessMessage('Teacher added successfully!');
      setTName('');
      setTEmail('');
      setTPass('');
      setTCode('');
      setTCName('');
      loadAll();
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage('Error: ' + (res.error || 'Unknown error'));
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    const res = await api.createStudent(token, sName, sEmail, sRoll, sPass, sCode);
    setLoading(false);
    if (res.ok) {
      setSuccessMessage('Student enrolled successfully!');
      setSName('');
      setSEmail('');
      setSRoll('');
      setSPass('');
      setSCode('');
      loadAll();
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage('Error: ' + (res.error || 'Unknown error'));
    }
  };

  const filteredTeachers =
    filter === 'all' ? teachers : teachers.filter(t => t.course_code === filter);
  const filteredStudents =
    filter === 'all' ? students : students.filter(s => s.course_code === filter);

  return (
    <>
      <Navigation />
      <div className="container" style={{ paddingTop: '20px' }}>
        <div className="header">
          <h1>Admin Control Panel</h1>
          <div className="filter-box">
            <label>Filter by Course:</label>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_name} ({c.course_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

        <div className="admin-grid">
          <div className="card">
            <h3>Add Teacher</h3>
            <form onSubmit={handleCreateTeacher}>
              <div className="form-group">
                <label>Teacher Name</label>
                <input
                  placeholder="Full Name"
                  value={tName}
                  onChange={e => setTName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={tEmail}
                  onChange={e => setTEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Set password"
                  value={tPass}
                  onChange={e => setTPass(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Course Code</label>
                <input
                  placeholder="e.g., JAI-001"
                  value={tCode}
                  onChange={e => setTCode(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  placeholder="e.g., Java"
                  value={tCName}
                  onChange={e => setTCName(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-blue" disabled={loading}>
                {loading ? 'Adding...' : 'Add Teacher'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Enroll Student</h3>
            <form onSubmit={handleCreateStudent}>
              <div className="form-group">
                <label>Student Name</label>
                <input
                  placeholder="Full Name"
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={sEmail}
                  onChange={e => setSEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Roll Number</label>
                <input
                  placeholder="e.g., 15"
                  value={sRoll}
                  onChange={e => setSRoll(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Set password"
                  value={sPass}
                  onChange={e => setSPass(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Course</label>
                <select value={sCode} onChange={e => setSCode(e.target.value)} required>
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.course_code} value={c.course_code}>
                      {c.course_name} ({c.course_code})
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-green" disabled={loading}>
                {loading ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </form>
          </div>
        </div>

        <div className="admin-grid" style={{ marginTop: '30px' }}>
          <div>
            <div className="card">
              <h4>Teachers ({filteredTeachers.length})</h4>
              <div className="list-container">
                {filteredTeachers.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                    No teachers found
                  </p>
                ) : (
                  filteredTeachers.map(t => (
                    <div key={t.course_code} className="data-card teacher-indicator">
                      <div>
                        <strong>{t.teacher_name}</strong>
                        <br />
                        <small>{t.course_name} ({t.course_code})</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <h4>Students ({filteredStudents.length})</h4>
              <div className="list-container">
                {filteredStudents.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                    No students found
                  </p>
                ) : (
                  filteredStudents.map(s => (
                    <div key={`${s.roll_number}-${s.course_code}`} className="data-card student-indicator">
                      <div>
                        <strong>{s.name}</strong>
                        <br />
                        <small>ID: {s.roll_number} | {s.course_code}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}