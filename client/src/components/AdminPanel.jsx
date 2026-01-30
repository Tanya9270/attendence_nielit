import { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'teachers', 'students'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Data States
  const [courses, setCourses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCourse, setSelectedCourse] = useState('');

  // Form States
  const [studentForm, setStudentForm] = useState({ name: '', rollNumber: '', courseCode: '' });
  const [teacherForm, setTeacherForm] = useState({ username: '', courseName: '', courseCode: '' });

  // 1. SECURITY GATEKEEPER
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
    } else if (user.role !== 'admin') {
      alert("Access Denied: You must be an Admin to view this page.");
      navigate('/dashboard'); // Kick them back to student/teacher dashboard
    } else {
      loadCourses();
    }
  }, [navigate, user.role, token]);

  // 2. DATA FETCHING
  const loadCourses = async () => {
    try {
      const data = await api.getCourses(token);
      setCourses(data || []);
      if (data.length > 0) setSelectedCourse(data[0].course_code);
    } catch (err) {
      console.error("Failed to load courses", err);
    }
  };

  const loadAttendance = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const res = await api.getDailyAttendance(token, selectedDate, selectedCourse);
      if (res.ok) {
        setAttendanceData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. ACTION HANDLERS
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // API call to add student to DB
      const res = await api.createStudent(token, studentForm.rollNumber, studentForm.name, [studentForm.courseCode]);
      if (res.ok) {
        setMessage({ type: 'success', text: 'Student added successfully!' });
        setStudentForm({ name: '', rollNumber: '', courseCode: courses[0]?.course_code || '' });
      } else {
        setMessage({ type: 'error', text: 'Failed to add student.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error adding student.' });
    }
    setLoading(false);
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // API call to add Course/Teacher mapping
      const res = await api.createTeacher(token, teacherForm.username, 'dummy_pass', [teacherForm.courseCode], teacherForm.courseName);
      if (res.ok) {
        setMessage({ type: 'success', text: 'Teacher & Course data saved! (Remember to create the User in Supabase Auth)' });
        setTeacherForm({ username: '', courseName: '', courseCode: '' });
        loadCourses(); // Refresh list
      } else {
        setMessage({ type: 'error', text: 'Failed to add teacher.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error adding teacher.' });
    }
    setLoading(false);
  };

  // 4. RENDER UI
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Portal</h1>
            <p className="text-gray-600">Welcome back, {user.username}</p>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Logout
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          {['dashboard', 'teachers', 'students'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMessage(null); }}
              className={`pb-2 px-4 capitalize font-medium ${
                activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Feedback Messages */}
        {message && (
          <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* --- TAB: DASHBOARD (View Attendance) --- */}
        {activeTab === 'dashboard' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Daily Attendance Overview</h2>
            <div className="flex gap-4 mb-6">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="border p-2 rounded"
              />
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)} 
                className="border p-2 rounded"
              >
                {courses.map(c => <option key={c.id} value={c.course_code}>{c.course_name}</option>)}
              </select>
              <button onClick={loadAttendance} className="bg-blue-600 text-white px-4 py-2 rounded">
                Load Data
              </button>
            </div>

            {loading ? <p>Loading...</p> : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 border">Roll Number</th>
                    <th className="p-3 border">Student Name</th>
                    <th className="p-3 border">Time</th>
                    <th className="p-3 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.length === 0 ? (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-500">No attendance records found for this date.</td></tr>
                  ) : (
                    attendanceData.map((record) => (
                      <tr key={record.id} className="border-b">
                        <td className="p-3">{record.students?.roll_number || 'N/A'}</td>
                        <td className="p-3">{record.students?.name || 'Unknown'}</td>
                        <td className="p-3">{new Date(record.created_at).toLocaleTimeString()}</td>
                        <td className="p-3"><span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Present</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* --- TAB: ADD TEACHERS --- */}
        {activeTab === 'teachers' && (
          <div className="bg-white p-6 rounded-lg shadow max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add New Teacher & Course</h2>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Teacher Email / Name</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. teacher1" 
                  value={teacherForm.username} onChange={e => setTeacherForm({...teacherForm, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Name</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. Web Development"
                  value={teacherForm.courseName} onChange={e => setTeacherForm({...teacherForm, courseName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Code</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. CS101"
                  value={teacherForm.courseCode} onChange={e => setTeacherForm({...teacherForm, courseCode: e.target.value})} />
              </div>
              <button disabled={loading} className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
                {loading ? 'Saving...' : 'Add Teacher & Course'}
              </button>
            </form>
            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded">
              <strong>Note:</strong> After clicking this, go to Supabase Auth Dashboard and create a user with email <em>{teacherForm.username || 'username'}@nielit.com</em>.
            </div>
          </div>
        )}

        {/* --- TAB: ADD STUDENTS --- */}
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-lg shadow max-w-lg">
            <h2 className="text-xl font-bold mb-4">Register New Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. Rahul Kumar"
                  value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Roll Number</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. 2024001"
                  value={studentForm.rollNumber} onChange={e => setStudentForm({...studentForm, rollNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Course</label>
                <select className="w-full border p-2 rounded"
                   value={studentForm.courseCode} onChange={e => setStudentForm({...studentForm, courseCode: e.target.value})}>
                   <option value="">Select a Course</option>
                   {courses.map(c => <option key={c.id} value={c.course_code}>{c.course_name}</option>)}
                </select>
              </div>
              <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                {loading ? 'Saving...' : 'Register Student'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}