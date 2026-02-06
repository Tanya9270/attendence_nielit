import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Navigation from './Navigation';

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
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
      // getCourses returns { ok: true, courses: [...] }
      setCourses(c.ok ? (c.courses || []) : (Array.isArray(c) ? c : []));
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to load data');
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    const res = await api.createTeacher(token, tName, tEmail, tPass, tCode, tCName);
    setLoading(false);
    if (res.ok) {
      showSuccess('Teacher added successfully!');
      setTName(''); setTEmail(''); setTPass(''); setTCode(''); setTCName('');
      loadAll();
    } else {
      showError('Error: ' + (res.error || 'Unknown error'));
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
      showSuccess('Student enrolled successfully!');
      setSName(''); setSEmail(''); setSRoll(''); setSPass(''); setSCode('');
      loadAll();
    } else {
      showError('Error: ' + (res.error || 'Unknown error'));
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    const name = teacher.teacher_name || 'this teacher';
    if (!window.confirm(`Are you sure you want to delete ${name}? This will remove them from all courses and delete their account permanently.`)) {
      return;
    }
    const userId = teacher.teacher_id;
    if (!userId) {
      showError('Cannot delete: teacher ID not found');
      return;
    }
    setDeleting(userId);
    try {
      const res = await api.deleteUser(token, userId);
      if (res.ok || res.message) {
        showSuccess(`${name} has been deleted`);
        loadAll();
      } else {
        showError('Failed to delete teacher: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      showError('Failed to delete teacher');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteStudent = async (student) => {
    const name = student.name || 'this student';
    if (!window.confirm(`Are you sure you want to delete ${name} (Roll: ${student.roll_number})? This will permanently remove their account and all attendance records.`)) {
      return;
    }
    const userId = student.user_id;
    if (!userId) {
      showError('Cannot delete: student user ID not found');
      return;
    }
    setDeleting(userId);
    try {
      const res = await api.deleteUser(token, userId);
      if (res.ok || res.message) {
        showSuccess(`${name} has been deleted`);
        loadAll();
      } else {
        showError('Failed to delete student: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      showError('Failed to delete student');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredTeachers =
    filter === 'all' ? teachers : teachers.filter(t => t.course_code === filter);
  const filteredStudents =
    filter === 'all' ? students : students.filter(s => s.course_code === filter);

  // Get unique teachers by teacher_id
  const uniqueTeacherCount = new Set(teachers.map(t => t.teacher_id).filter(Boolean)).size;

  // Count students per course
  const studentCountByCourse = {};
  students.forEach(s => {
    if (s.course_code) {
      studentCountByCourse[s.course_code] = (studentCountByCourse[s.course_code] || 0) + 1;
    }
  });

  // Lookup course name by code
  const courseNameByCode = {};
  courses.forEach(c => {
    if (c.course_code) {
      courseNameByCode[c.course_code] = c.course_name;
    }
  });

  const tabStyle = (tab) => ({
    padding: '12px 24px',
    border: 'none',
    background: activeTab === tab ? 'linear-gradient(135deg, #003E8E 0%, #0066B3 100%)' : 'transparent',
    color: activeTab === tab ? 'white' : '#666',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    borderRadius: activeTab === tab ? '8px 8px 0 0' : '0',
    transition: 'all 0.3s'
  });

  return (
    <>
      <Navigation />
      <div className="container" style={{ paddingTop: '20px' }}>
        {/* Header */}
        <div className="header">
          <div>
            <h1 style={{ fontSize: '22px', marginBottom: '2px' }}>Admin Control Panel</h1>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>Manage teachers, students & courses</span>
          </div>
          <div className="filter-box">
            <label>Course:</label>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Courses ({students.length} students)</option>
              {courses.map(c => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} - {c.course_name} ({studentCountByCourse[c.course_code] || 0} students)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && <div className="alert alert-success" style={{ fontWeight: 'bold', textAlign: 'center' }}>{successMessage}</div>}
        {errorMessage && <div className="alert alert-error" style={{ fontWeight: 'bold', textAlign: 'center' }}>{errorMessage}</div>}

        {/* Stats Dashboard */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '15px',
          marginBottom: '25px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #003E8E 0%, #0066B3 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{courses.length}</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Total Courses</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{uniqueTeacherCount}</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Teachers</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{students.length}</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Total Students</div>
          </div>
          <div style={{
            background: filter !== 'all' ? 'linear-gradient(135deg, #E65100 0%, #FF9800 100%)' : 'linear-gradient(135deg, #757575 0%, #BDBDBD 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {filter !== 'all' ? filteredStudents.length : '--'}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              {filter !== 'all' ? `In ${filter}` : 'Select Course'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card" style={{ borderRadius: '12px', padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e0e0e0',
            flexWrap: 'wrap'
          }}>
            <button onClick={() => setActiveTab('overview')} style={tabStyle('overview')}>
              Teachers & Students
            </button>
            <button onClick={() => setActiveTab('addTeacher')} style={tabStyle('addTeacher')}>
              + Add Teacher
            </button>
            <button onClick={() => setActiveTab('addStudent')} style={tabStyle('addStudent')}>
              + Enroll Student
            </button>
          </div>

          <div style={{ padding: '25px' }}>
            {/* Overview Tab - Teacher & Student Lists */}
            {activeTab === 'overview' && (
              <div className="admin-grid" style={{ marginTop: 0 }}>
                {/* Teachers List */}
                <div>
                  <h3 style={{ color: '#003E8E', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Teachers</span>
                    <span style={{
                      background: '#003E8E',
                      color: 'white',
                      padding: '3px 12px',
                      borderRadius: '15px',
                      fontSize: '13px'
                    }}>
                      {filteredTeachers.length}
                    </span>
                  </h3>
                  <div className="list-container">
                    {filteredTeachers.length === 0 ? (
                      <p style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
                        No teachers found
                        {filter !== 'all' && <><br /><small>Try selecting "All Courses"</small></>}
                      </p>
                    ) : (
                      filteredTeachers.map((t, idx) => (
                        <div
                          key={`${t.course_code}-${idx}`}
                          className="data-card teacher-indicator"
                          style={{ transition: 'box-shadow 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,62,142,0.15)'}
                          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '15px', color: '#333' }}>{t.teacher_name || 'Unknown'}</strong>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                              {t.course_name} ({t.course_code})
                            </div>
                            {t.teacher_email && (
                              <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                                {t.teacher_email}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn-danger"
                            style={{
                              background: '#d32f2f',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              opacity: deleting === t.teacher_id ? 0.5 : 1
                            }}
                            onClick={() => handleDeleteTeacher(t)}
                            disabled={deleting === t.teacher_id}
                          >
                            {deleting === t.teacher_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Students List */}
                <div>
                  <h3 style={{ color: '#2E7D32', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Students</span>
                    <span style={{
                      background: '#2E7D32',
                      color: 'white',
                      padding: '3px 12px',
                      borderRadius: '15px',
                      fontSize: '13px'
                    }}>
                      {filteredStudents.length}
                    </span>
                  </h3>
                  <div className="list-container">
                    {filteredStudents.length === 0 ? (
                      <p style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
                        No students found
                        {filter !== 'all' && <><br /><small>Try selecting "All Courses"</small></>}
                      </p>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <div
                          key={`${s.roll_number}-${s.course_code}-${idx}`}
                          className="data-card student-indicator"
                          style={{ transition: 'box-shadow 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(46,125,50,0.15)'}
                          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '15px', color: '#333' }}>{s.name}</strong>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                              Roll: {s.roll_number} | {courseNameByCode[s.course_code] || s.course_code} ({s.course_code})
                            </div>
                            {s.email && (
                              <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                                {s.email}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn-danger"
                            style={{
                              background: '#d32f2f',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              opacity: deleting === s.user_id ? 0.5 : 1
                            }}
                            onClick={() => handleDeleteStudent(s)}
                            disabled={deleting === s.user_id}
                          >
                            {deleting === s.user_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Teacher Tab */}
            {activeTab === 'addTeacher' && (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h3 style={{ color: '#003E8E', marginBottom: '20px', textAlign: 'center' }}>Add New Teacher</h3>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                  </div>
                  <button className="btn btn-blue" disabled={loading} style={{ marginTop: '10px' }}>
                    {loading ? 'Adding...' : 'Add Teacher'}
                  </button>
                </form>
              </div>
            )}

            {/* Enroll Student Tab */}
            {activeTab === 'addStudent' && (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h3 style={{ color: '#2E7D32', marginBottom: '20px', textAlign: 'center' }}>Enroll New Student</h3>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                  </div>
                  <div className="form-group">
                    <label>Course</label>
                    <select value={sCode} onChange={e => setSCode(e.target.value)} required>
                      <option value="">Select Course</option>
                      {courses.map(c => (
                        <option key={c.course_code} value={c.course_code}>
                          {c.course_code} - {c.course_name} ({studentCountByCourse[c.course_code] || 0} enrolled)
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-green" disabled={loading} style={{ marginTop: '10px' }}>
                    {loading ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Course Breakdown - only show when "All Courses" is selected */}
        {filter === 'all' && courses.length > 0 && (
          <div className="card" style={{ borderRadius: '12px', marginTop: '10px' }}>
            <h3 style={{ color: '#003E8E', marginBottom: '15px' }}>Course Breakdown</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #003E8E 0%, #0066B3 100%)', color: 'white' }}>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>#</th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>Course Code</th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>Course Name</th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>Teacher</th>
                    <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600' }}>Students</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, idx) => (
                    <tr
                      key={c.course_code}
                      style={{
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => { setFilter(c.course_code); setActiveTab('overview'); }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 15px', color: '#666' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 15px' }}>
                        <strong style={{ color: '#003E8E' }}>{c.course_code}</strong>
                      </td>
                      <td style={{ padding: '12px 15px' }}>{c.course_name}</td>
                      <td style={{ padding: '12px 15px', color: '#555' }}>{c.teacher_name || '-'}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                        <span style={{
                          background: (studentCountByCourse[c.course_code] || 0) > 0 ? '#e8f5e9' : '#f5f5f5',
                          color: (studentCountByCourse[c.course_code] || 0) > 0 ? '#2E7D32' : '#999',
                          padding: '4px 14px',
                          borderRadius: '15px',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {studentCountByCourse[c.course_code] || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
