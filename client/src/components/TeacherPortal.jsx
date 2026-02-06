import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import QRCode from 'qrcode';
import Navigation from './Navigation';
import AdminPanel from './AdminPanel';

// Teacher Portal Component - v2.0
export default function TeacherPortal() {
  const [activeTab, setActiveTab] = useState('qr');
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [finalized, setFinalized] = useState(false);
  const [qrActive, setQrActive] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [timeOffset, setTimeOffset] = useState(0);
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthlyExportMenu, setShowMonthlyExportMenu] = useState(false);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    if (!token || (user.role !== 'teacher' && user.role !== 'admin')) {
      navigate('/');
      return;
    }
    syncTime();
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await api.getCourses(token);
      if (data.ok) {
        const courseList = data.courses || [];
        setCourses(courseList);
        // Auto-select if teacher has only one course
        if (courseList.length === 1 && !selectedCourse) {
          setSelectedCourse(courseList[0].course_code);
        }
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'view') {
      loadAttendance();
    }
  }, [activeTab, date, selectedCourse]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlyAttendance();
    }
  }, [activeTab, selectedMonth, selectedYear, selectedCourse]);

  // QR code generation effect - aligned to 15-second window boundaries
  useEffect(() => {
    if (qrActive && timeOffset !== 0) {
      // Generate QR immediately
      generateQR();
      
      // Calculate time until next 15-second boundary
      const now = Date.now() + timeOffset;
      const secondsInWindow = Math.floor((now / 1000) % 15);
      const msUntilNextWindow = (15 - secondsInWindow) * 1000 - (now % 1000);
      
      // Set initial countdown
      setCountdown(15 - secondsInWindow);
      
      let qrInterval = null;
      
      // Schedule first QR regeneration at the next 15-second boundary, then every 15 seconds
      const initialTimeout = setTimeout(() => {
        generateQR();
        setCountdown(15);
        
        // Start aligned interval after first boundary
        qrInterval = setInterval(() => {
          generateQR();
          setCountdown(15);
        }, 15000);
      }, msUntilNextWindow);

      // Update countdown every 200ms for smooth updates, aligned to server time
      const countdownInterval = setInterval(() => {
        const currentTime = Date.now() + timeOffset;
        const currentSecondsInWindow = Math.floor((currentTime / 1000) % 15);
        const remaining = 15 - currentSecondsInWindow;
        setCountdown(remaining === 0 ? 15 : remaining);
      }, 200);

      return () => {
        clearTimeout(initialTimeout);
        if (qrInterval) clearInterval(qrInterval);
        clearInterval(countdownInterval);
      };
    }
  }, [qrActive, timeOffset]);

  // Auto-refresh attendance when QR is active
  useEffect(() => {
    if (qrActive && activeTab === 'qr') {
      const refreshInterval = setInterval(loadAttendance, 5000);
      return () => clearInterval(refreshInterval);
    }
  }, [qrActive, activeTab]);

  // Close export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu || showMonthlyExportMenu) {
        // Close menus if click is outside
        if (!event.target.closest('.export-dropdown')) {
          setShowExportMenu(false);
          setShowMonthlyExportMenu(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu, showMonthlyExportMenu]);

  const syncTime = async () => {
    try {
      const data = await api.getServerTime();
      const clientNow = Date.now();
      const serverNow = data.server_time_ms;
      const offset = serverNow - clientNow;
      setTimeOffset(offset);
    } catch (err) {
      console.error('Time sync error:', err);
    }
  };

  const generateQR = async () => {
    if (!canvasRef.current) return;

    try {
      const now = Date.now() + timeOffset;
      // Format: ATTENDANCE|teacher_id|timestamp_ms
      const payload = `ATTENDANCE|${user.id}|${now}`;

      await QRCode.toCanvas(canvasRef.current, payload, {
        width: 350,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.getDailyAttendance(token, date, '', '', selectedCourse);
      setAttendance(data.students || []);
      setFinalized(data.finalized || false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load attendance' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlyAttendance(token, selectedMonth, selectedYear, '', '', selectedCourse);
      if (data.ok) {
        setMonthlyData(data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load monthly attendance' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize attendance for this date? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.finalizeAttendance(token, date, '', '', selectedCourse);
      if (response.ok) {
        setMessage({ type: 'success', text: 'Attendance finalized successfully' });
        setFinalized(true);
        await loadAttendance();
      } else {
        setMessage({ type: 'error', text: 'Failed to finalize attendance' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to finalize attendance' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const blob = await api.exportAttendance(token, date, '', '', selectedCourse);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Attendance exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export attendance' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDailyPDF = async () => {
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course first' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setShowExportMenu(false);
      return;
    }
    try {
      setLoading(true);
      setShowExportMenu(false);
      const blob = await api.exportDailyPDF(token, date, '', '', selectedCourse);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${selectedCourse}-${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Daily PDF exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to export PDF' });
      console.error(err);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDailyCSV = async () => {
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course first' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setShowExportMenu(false);
      return;
    }
    try {
      setLoading(true);
      setShowExportMenu(false);
      const blob = await api.exportDailyCSV(token, date, '', '', selectedCourse);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${selectedCourse}-${date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Daily CSV exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to export CSV' });
      console.error(err);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMonthlyPDF = async () => {
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course first' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setShowMonthlyExportMenu(false);
      return;
    }
    try {
      setLoading(true);
      setShowMonthlyExportMenu(false);
      const blob = await api.exportMonthlyPDF(token, selectedMonth, selectedYear, '', '', selectedCourse);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
      link.setAttribute('download', `attendance-${selectedCourse}-${monthName}-${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Monthly PDF exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to export PDF' });
      console.error(err);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMonthlyCSV = async () => {
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course first' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setShowMonthlyExportMenu(false);
      return;
    }
    try {
      setLoading(true);
      setShowMonthlyExportMenu(false);
      const blob = await api.exportMonthlyCSV(token, selectedMonth, selectedYear, '', '', selectedCourse);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
      link.setAttribute('download', `attendance-${selectedCourse}-${monthName}-${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Monthly CSV exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to export CSV' });
      console.error(err);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const startQR = () => {
    setQrActive(true);
    loadAttendance();
  };

  const stopQR = () => {
    setQrActive(false);
  };

  const presentCount = attendance.filter(s => s.status === 'present').length;
  const absentCount = attendance.filter(s => s.status === 'absent').length;

  return (
    <>
      <Navigation />
      <div className="container" style={{ paddingTop: '20px' }}>
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '45px', background: 'white', padding: '5px', borderRadius: '6px' }} />
            <div>
              <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>Faculty Portal</h1>
              <span style={{ fontSize: '11px', opacity: '0.9' }}>QR Attendance System</span>
            </div>
          </div>
        </div>
        {message.text && (
          <div 
            className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {message.text}
          </div>
        )}

        <div className="card" style={{ borderRadius: '12px' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '2px solid #e0e0e0',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setActiveTab('qr')}
              style={{
                padding: '15px 30px',
                border: 'none',
                background: activeTab === 'qr' ? 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)' : 'transparent',
                color: activeTab === 'qr' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '600',
                borderRadius: activeTab === 'qr' ? '8px 8px 0 0' : '0',
                transition: 'all 0.3s'
              }}
            >
              📱 Show QR Code
            </button>
            <button
              onClick={() => setActiveTab('view')}
              style={{
                padding: '15px 30px',
                border: 'none',
                background: activeTab === 'view' ? 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)' : 'transparent',
                color: activeTab === 'view' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '600',
                borderRadius: activeTab === 'view' ? '8px 8px 0 0' : '0',
                transition: 'all 0.3s'
              }}
            >
              📋 Daily View
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              style={{
                padding: '15px 30px',
                border: 'none',
                background: activeTab === 'monthly' ? 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)' : 'transparent',
                color: activeTab === 'monthly' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '600',
                borderRadius: activeTab === 'monthly' ? '8px 8px 0 0' : '0',
                transition: 'all 0.3s'
              }}
            >
              📊 Monthly Report
            </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  style={{
                    padding: '15px 30px',
                    border: 'none',
                    background: activeTab === 'admin' ? 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)' : 'transparent',
                    color: activeTab === 'admin' ? 'white' : '#666',
                    cursor: 'pointer',
                    fontWeight: '600',
                    borderRadius: activeTab === 'admin' ? '8px 8px 0 0' : '0',
                    transition: 'all 0.3s'
                  }}
                >
                  🛠 Admin
                </button>
              )}
          </div>

          {activeTab === 'qr' && (
            <div>
              <h2 style={{ marginBottom: '20px', textAlign: 'center', color: '#0066B3' }}>Attendance QR Code</h2>
              <p style={{ color: '#666', marginBottom: '20px', textAlign: 'center' }}>
                Share your screen or display this QR code for students to scan
              </p>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '20px'
              }}>
                {!qrActive ? (
                  <button onClick={startQR} className="btn btn-primary" style={{ fontSize: '18px', padding: '15px 40px' }}>
                    Start Attendance Session
                  </button>
                ) : (
                  <>
                    <div style={{
                      padding: '20px',
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,102,179,0.15)',
                      border: '3px solid #0066B3'
                    }}>
                      <canvas ref={canvasRef} style={{ display: 'block' }} />
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 20px',
                      background: countdown <= 5 ? '#fff3cd' : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      borderRadius: '25px',
                      border: countdown <= 5 ? '2px solid #ffc107' : '2px solid #0066B3'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: countdown <= 5 ? '#ffc107' : 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)',
                        color: countdown <= 5 ? '#000' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '18px'
                      }}>
                        {countdown}
                      </div>
                      <span style={{ fontWeight: '500' }}>
                        QR refreshes in {countdown} seconds
                      </span>
                    </div>

                    <button onClick={stopQR} className="btn btn-secondary">
                      Stop Session
                    </button>

                    {/* Live attendance count */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '20px',
                      marginTop: '20px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
                      borderRadius: '12px',
                      width: '100%',
                      maxWidth: '400px',
                      border: '1px solid #cce5ff'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8DC63F' }}>
                          {presentCount}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Present</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#E91E8C' }}>
                          {absentCount}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Absent</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066B3' }}>
                          {attendance.length}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Total</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="alert alert-info" style={{ 
                marginTop: '30px',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                border: '1px solid #0066B3',
                borderRadius: '12px'
              }}>
                <strong style={{ color: '#0066B3' }}>Instructions for Online Class:</strong>
                <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
                  <li>Click "Start Attendance Session" to generate the QR code</li>
                  <li>Share your screen so students can see the QR code</li>
                  <li>Students scan the QR using their phone camera on the Student Portal</li>
                  <li>The QR refreshes every 15 seconds for security</li>
                  <li>Attendance count updates automatically</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'view' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: '#0066B3' }}>Daily Attendance View</h2>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Course</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    style={{ 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid #ddd',
                      width: '100%'
                    }}
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.course_code} value={course.course_code}>
                        {course.course_code} - {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '10px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                <button onClick={loadAttendance} className="btn btn-primary" disabled={loading}>
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                
                {/* Export Dropdown */}
                <div style={{ position: 'relative' }} className="export-dropdown">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)} 
                    className="btn btn-secondary" 
                    disabled={attendance.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    📥 Export ▼
                  </button>
                  {showExportMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '160px',
                      marginTop: '5px'
                    }}>
                      <button 
                        onClick={handleExportDailyPDF}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 15px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                        onMouseOut={(e) => e.target.style.background = 'none'}
                      >
                        📄 Export as PDF
                      </button>
                      <button 
                        onClick={handleExportDailyCSV}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 15px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                        onMouseOut={(e) => e.target.style.background = 'none'}
                      >
                        📊 Export as CSV
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleFinalize} 
                  className="btn btn-success" 
                  disabled={loading || finalized || attendance.length === 0}
                >
                  {finalized ? 'Finalized' : 'Finalize Attendance'}
                </button>
              </div>

              {finalized && (
                <div className="alert alert-info">
                  ✓ Attendance for this date has been finalized
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px',
                marginBottom: '20px',
                padding: '15px',
                background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
                borderRadius: '12px',
                border: '1px solid #cce5ff'
              }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8DC63F' }}>
                    {presentCount}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Present</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E91E8C' }}>
                    {absentCount}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Absent</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066B3' }}>
                    {attendance.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Total</div>
                </div>
              </div>

              {loading ? (
                <div className="loading">Loading attendance data...</div>
              ) : attendance.length === 0 ? (
                <div className="text-center" style={{ padding: '40px', color: '#666' }}>
                  No students found
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Roll Number</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Scan Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((student, index) => (
                        <tr key={student.student_id}>
                          <td>{index + 1}</td>
                          <td><strong>{student.roll_number}</strong></td>
                          <td>{student.name}</td>
                          <td>
                            <span className={`status-badge status-${student.status}`}>
                              {student.status}
                            </span>
                          </td>
                          <td>
                            {student.scan_time 
                              ? new Date(student.scan_time).toLocaleTimeString('en-IN', { 
                                  timeZone: 'Asia/Kolkata',
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                  second: '2-digit',
                                  hour12: true
                                })
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Monthly Report Tab */}
          {activeTab === 'monthly' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: '#0066B3' }}>Monthly Attendance Report</h2>

              {/* Filters */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{ 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid #ddd',
                      width: '100%'
                    }}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{ 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid #ddd',
                      width: '100%'
                    }}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Course</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    style={{ 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid #ddd',
                      width: '100%'
                    }}
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.course_code} value={course.course_code}>
                        {course.course_code} - {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '10px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                <button 
                  onClick={loadMonthlyAttendance} 
                  className="btn btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                
                {/* Monthly Export Dropdown */}
                <div style={{ position: 'relative' }} className="export-dropdown">
                  <button 
                    onClick={() => setShowMonthlyExportMenu(!showMonthlyExportMenu)} 
                    className="btn btn-secondary" 
                    disabled={!monthlyData}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    📥 Export ▼
                  </button>
                  {showMonthlyExportMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '160px',
                      marginTop: '5px'
                    }}>
                      <button 
                        onClick={handleExportMonthlyPDF}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 15px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                        onMouseOut={(e) => e.target.style.background = 'none'}
                      >
                        📄 Export as PDF
                      </button>
                      <button 
                        onClick={handleExportMonthlyCSV}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 15px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                        onMouseOut={(e) => e.target.style.background = 'none'}
                      >
                        📊 Export as CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="loading">Loading monthly data...</div>
              ) : monthlyData ? (
                <>
                  {/* Overall Stats Card */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '25px',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ marginBottom: '15px', opacity: 0.9 }}>
                      📅 {monthlyData.monthName} {monthlyData.year}
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '20px'
                    }}>
                      <div>
                        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                          {monthlyData.overallPercentage}%
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Overall Attendance</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                          {monthlyData.workingDays}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Session Days</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                          {monthlyData.totalStudents}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Students</div>
                      </div>
                    </div>
                  </div>

                  {/* Holidays this month */}
                  {monthlyData.holidays && monthlyData.holidays.length > 0 && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                      padding: '15px 20px',
                      borderRadius: '12px',
                      marginBottom: '25px',
                      border: '1px solid #9c27b0'
                    }}>
                      <span style={{ color: '#7b1fa2', fontWeight: '600' }}>
                        📅 Holidays this month: 
                      </span>
                      {monthlyData.holidays.map((h, idx) => (
                        <span key={idx} style={{
                          background: 'white',
                          padding: '5px 12px',
                          borderRadius: '15px',
                          marginLeft: '10px',
                          fontSize: '13px',
                          color: '#7b1fa2'
                        }}>
                          {new Date(h).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Daily Attendance Grid with Scan Times */}
                  <h3 style={{ color: '#0066B3', marginBottom: '15px' }}>Daily Attendance Report (1-{monthlyData.daysInMonth})</h3>
                  <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                    <table style={{ minWidth: '100%', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, background: '#0066B3', zIndex: 2, minWidth: '120px' }}>Student</th>
                          {monthlyData.dailyInfo && monthlyData.dailyInfo.map(d => (
                            <th 
                              key={d.day} 
                              style={{ 
                                minWidth: '65px', 
                                textAlign: 'center',
                                background: d.isWeekend ? '#ffebee' : d.isHoliday ? '#fff3e0' : d.hasSession ? '#e8f5e9' : '#f5f5f5',
                                color: d.isWeekend ? '#c62828' : d.isHoliday ? '#e65100' : '#333',
                                padding: '8px 4px'
                              }}
                            >
                              <div>{d.day}</div>
                              <div style={{ fontSize: '10px', opacity: 0.7 }}>{d.dayName}</div>
                            </th>
                          ))}
                          <th style={{ minWidth: '60px', textAlign: 'center' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.students.map((student) => (
                          <tr key={student.student_id}>
                            <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1, fontWeight: 'bold' }}>
                              <div>{student.roll_number}</div>
                              <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>{student.name}</div>
                            </td>
                            {student.daily && student.daily.map((d, idx) => {
                              const dayInfo = monthlyData.dailyInfo[idx];
                              return (
                                <td 
                                  key={d.day}
                                  style={{
                                    textAlign: 'center',
                                    padding: '4px',
                                    background: dayInfo?.isWeekend ? '#ffebee' : dayInfo?.isHoliday ? '#fff3e0' : 'white',
                                    verticalAlign: 'middle'
                                  }}
                                  title={d.scan_time ? `Scanned at ${new Date(d.scan_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}` : ''}
                                >
                                  {d.status === 'present' ? (
                                    <div>
                                      <span style={{ color: '#8DC63F', fontSize: '14px' }}>✓</span>
                                      {d.scan_time && (
                                        <div style={{ fontSize: '9px', color: '#666' }}>
                                          {new Date(d.scan_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </div>
                                      )}
                                    </div>
                                  ) : d.status === 'absent' ? (
                                    <span style={{ color: '#E91E8C', fontSize: '14px' }}>✗</span>
                                  ) : d.status === 'leave' ? (
                                    <span style={{ color: '#ff9800', fontSize: '14px' }}>L</span>
                                  ) : dayInfo?.isWeekend ? (
                                    <span style={{ color: '#ccc', fontSize: '10px' }}>W</span>
                                  ) : dayInfo?.isHoliday ? (
                                    <span style={{ color: '#ccc', fontSize: '10px' }}>H</span>
                                  ) : (
                                    <span style={{ color: '#ccc' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ 
                              textAlign: 'center', 
                              fontWeight: 'bold',
                              color: student.percentage >= 75 ? '#2e7d32' : student.percentage >= 50 ? '#e65100' : '#c62828'
                            }}>
                              {student.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Student-wise Summary Table */}
                  <h3 style={{ color: '#0066B3', marginBottom: '15px' }}>Student-wise Summary</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Roll Number</th>
                          <th>Name</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Leave</th>
                          <th>Percentage</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.students.map((student, index) => (
                          <tr key={student.student_id}>
                            <td>{index + 1}</td>
                            <td><strong>{student.roll_number}</strong></td>
                            <td>{student.name}</td>
                            <td style={{ color: '#8DC63F', fontWeight: 'bold' }}>{student.present}</td>
                            <td style={{ color: '#E91E8C', fontWeight: 'bold' }}>{student.absent}</td>
                            <td style={{ color: '#ff9800', fontWeight: 'bold' }}>{student.leave}</td>
                            <td>
                              <span style={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                background: student.percentage >= 75 
                                  ? '#e8f5e9' 
                                  : student.percentage >= 50 
                                    ? '#fff3e0' 
                                    : '#ffebee',
                                color: student.percentage >= 75 
                                  ? '#2e7d32' 
                                  : student.percentage >= 50 
                                    ? '#e65100' 
                                    : '#c62828'
                              }}>
                                {student.percentage}%
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                background: student.percentage >= 75 
                                  ? '#8DC63F' 
                                  : student.percentage >= 50 
                                    ? '#ff9800' 
                                    : '#E91E8C',
                                color: 'white'
                              }}>
                                {student.percentage >= 75 
                                  ? '✓ Good' 
                                  : student.percentage >= 50 
                                    ? '⚠ Low' 
                                    : '✗ Critical'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    background: '#f5f5f5', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    <strong>Legend:</strong>
                    <span style={{ marginLeft: '15px', color: '#8DC63F' }}>✓ Present</span>
                    <span style={{ marginLeft: '15px', color: '#E91E8C' }}>✗ Absent</span>
                    <span style={{ marginLeft: '15px', color: '#ff9800' }}>L Leave</span>
                    <span style={{ marginLeft: '15px', color: '#ccc' }}>W Weekend</span>
                    <span style={{ marginLeft: '15px', color: '#ccc' }}>H Holiday</span>
                    <span style={{ marginLeft: '15px', color: '#ccc' }}>- No Session</span>
                    <div style={{ marginTop: '8px' }}>
                      <strong>Note:</strong> Working days = Days when attendance session was conducted. Scan time shown below ✓ mark.
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center" style={{ padding: '40px', color: '#666' }}>
                  Select filters and click Refresh to load monthly report
                </div>
              )}
            </div>
          )}
          {activeTab === 'admin' && isAdmin && (
            <div style={{ padding: '20px' }}>
              <AdminPanel token={token} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
