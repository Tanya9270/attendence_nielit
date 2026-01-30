import { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Data States
  const [courses, setCourses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCourse, setSelectedCourse] = useState('');

  // Form States
  const [studentForm, setStudentForm] = useState({ name: '', rollNumber: '', courseCode: '' });
  
  // UPDATED: Form matches your requested columns
  const [teacherForm, setTeacherForm] = useState({ 
    username: '', 
    password: '', 
    courseCode: '', 
    courseName: '' 
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
    } else if (user.role !== 'admin') {
      alert("Access Denied: Admin Only.");
      navigate('/dashboard'); 
    } else {
      loadCourses();
    }
  }, [navigate, user.role, token]);

  const loadCourses = async () => {
    try {
      const data = await api.getCourses(token);
      setCourses(data || []);
      if (data.length > 0) setSelectedCourse(data[0].course_code);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAttendance = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const res = await api.getDailyAttendance(token, selectedDate, selectedCourse);
      if (res.ok) setAttendanceData(res.data);
    } catch (err) { console.error(err); } 
    setLoading(false);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createStudent(token, studentForm.rollNumber, studentForm.name, [studentForm.courseCode]);
      if (res.ok) {
        setMessage({ type: 'success', text: 'Student added successfully!' });
        setStudentForm({ name: '', rollNumber: '', courseCode: courses[0]?.course_code || '' });
      } else { setMessage({ type: 'error', text: 'Failed to add student.' }); }
    } catch (err) { setMessage({ type: 'error', text: 'Error adding student.' }); }
    setLoading(false);
  };

  // UPDATED: Sends Username, Password, Course Code, Course Name
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createTeacher(
        token, 
        teacherForm.username, 
        teacherForm.password, 
        teacherForm.courseCode, 
        teacherForm.courseName
      );
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Teacher added! (Remember to also create this user in Supabase Auth)' });
        setTeacherForm({ username: '', password: '', courseCode: '', courseName: '' });
      } else {
        setMessage({ type: 'error', text: 'Failed to add teacher.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error adding teacher.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Portal</h1>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
        </div>

        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          {['dashboard', 'teachers', 'students'].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setMessage(null); }}
              className={`pb-2 px-4 capitalize font-medium ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
              {tab}
            </button>
          ))}
        </div>

        {message && <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Attendance Overview</h2>
            <div className="flex gap-4 mb-6">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border p-2 rounded" />
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="border p-2 rounded">
                {courses.map(c => <option key={c.id} value={c.course_code}>{c.course_name}</option>)}
              </select>
              <button onClick={loadAttendance} className="bg-blue-600 text-white px-4 py-2 rounded">Load</button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-100"><th className="p-3 border">Roll</th><th className="p-3 border">Name</th><th className="p-3 border">Status</th></tr></thead>
              <tbody>
                {attendanceData.map((r) => (
                  <tr key={r.id} className="border-b"><td className="p-3">{r.students?.roll_number}</td><td className="p-3">{r.students?.name}</td><td className="p-3">Present</td></tr>
                ))}
                {attendanceData.length === 0 && <tr><td colSpan="3" className="p-4 text-center">No records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* TEACHERS TAB (UPDATED) */}
        {activeTab === 'teachers' && (
          <div className="bg-white p-6 rounded-lg shadow max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add Teacher & Course</h2>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. teacher1"
                  value={teacherForm.username} onChange={e => setTeacherForm({...teacherForm, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input required className="w-full border p-2 rounded" placeholder="Enter password"
                  value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Name</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. Java Programming"
                  value={teacherForm.courseName} onChange={e => setTeacherForm({...teacherForm, courseName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Code</label>
                <input required className="w-full border p-2 rounded" placeholder="e.g. CS-202"
                  value={teacherForm.courseCode} onChange={e => setTeacherForm({...teacherForm, courseCode: e.target.value})} />
              </div>
              <button disabled={loading} className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
                {loading ? 'Saving...' : 'Add Teacher'}
              </button>
            </form>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="bg-white p-6 rounded-lg shadow max-w-lg">
            <h2 className="text-xl font-bold mb-4">Register Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <input required className="w-full border p-2 rounded" placeholder="Full Name" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
              <input required className="w-full border p-2 rounded" placeholder="Roll Number" value={studentForm.rollNumber} onChange={e => setStudentForm({...studentForm, rollNumber: e.target.value})} />
              <select className="w-full border p-2 rounded" value={studentForm.courseCode} onChange={e => setStudentForm({...studentForm, courseCode: e.target.value})}>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.course_code}>{c.course_name}</option>)}
              </select>
              <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Register Student</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}