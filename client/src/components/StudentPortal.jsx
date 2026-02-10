import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api';
import Navigation from './Navigation';

// Student Portal Component - v2.0
export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [scanTime, setScanTime] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const months = [
    { value: '', label: 'All (Overall)' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  useEffect(() => {
    if (!token || user.role !== 'student') {
      navigate('/');
      return;
    }

    loadStudent();

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadAttendanceStats();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const loadStudent = async () => {
    try {
      const data = await api.getStudentMe(token);
      if (data.id) {
        setStudent(data);
      } else {
        setError('Failed to load student profile');
      }
    } catch (err) {
      setError('Failed to load student profile');
      console.error(err);
    }
  };

  const loadAttendanceStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getStudentAttendanceStatsByMonth(token, selectedMonth, selectedYear);
      if (data.ok) {
        setAttendanceStats(data);
      }
    } catch (err) {
      console.error('Failed to load attendance stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const startScanner = async () => {
    try {
      setError('');
      setMessage({ type: '', text: '' });
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Make sure you are using HTTPS or localhost.');
      }
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      
      if (devices.length === 0) {
        throw new Error('No cameras found. Please check camera permissions.');
      }
      
      // Prefer rear camera on mobile
      let cameraId = devices[0].id;
      const rearCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      if (rearCamera) {
        cameraId = rearCamera.id;
      }
      
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: 250,
          aspectRatio: 1.0
        },
        async (decodedText) => {
          console.log('QR scanned:', decodedText);
          
          // Validate QR format before processing
          if (!decodedText.startsWith('ATTENDANCE|')) {
            setMessage({ type: 'error', text: 'Invalid QR code. Please scan the teacher\'s attendance QR.' });
            return;
          }
          
          // Stop scanner immediately to prevent duplicate scans
          await stopScanner();
          
          // Process the scan
          await handleScan(decodedText);
        },
        () => {}
      );

      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setError(`Failed to start camera: ${err.message}`);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  const handleScan = async (qrPayload) => {
    try {
      setMessage({ type: 'info', text: 'Marking attendance...' });
      
      const response = await api.markMyAttendance(token, qrPayload);
      console.log('markMyAttendance response:', response);
      
      if (response.ok) {
        setAttendanceMarked(true);
        setScanTime(new Date(response.scan_time));
        setMessage({ 
          type: 'success', 
          text: `✅ Attendance marked successfully at ${new Date(response.scan_time).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          })}!`
        });
        
        // Play success sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=');
          audio.play().catch(() => {});
        } catch (e) {}
      } else {
        let errorText = 'Failed to mark attendance';
        if (response.reason === 'timestamp_out_of_range') {
          errorText = `QR code expired (${response.delta_seconds}s old). Please scan a fresh QR code.`;
        } else if (response.reason === 'already_marked' || response.message === 'already_marked') {
          errorText = 'Your attendance is already marked for today!';
          setAttendanceMarked(true);
          // Set the scan time from existing attendance record
          if (response.scan_time) {
            setScanTime(new Date(response.scan_time));
          }
        } else if (response.reason === 'already_finalized') {
          errorText = 'Attendance has been finalized for today.';
        } else if (response.reason === 'invalid_qr_format') {
          errorText = 'Invalid QR code. Please scan the teacher\'s attendance QR.';
        }

        setMessage({ type: 'error', text: errorText });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to mark attendance. Please try again.' });
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const downloadMyCSV = () => {
    if (!attendanceStats || !attendanceStats.recentAttendance) return;
    const headers = ['Date', 'Day', 'Status', 'Scan Time'];
    const rows = attendanceStats.recentAttendance.map(record => [
      new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short' }),
      record.status,
      record.scan_time
        ? new Date(record.scan_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        : '-'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const monthLabel = selectedMonth ? months.find(m => m.value === selectedMonth)?.label || selectedMonth : 'Overall';
    a.download = `my-attendance-${monthLabel}-${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadMyPDF = async () => {
    if (!attendanceStats || !attendanceStats.recentAttendance) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;
      let yPosition = 8;

      // === NIELIT HEADER ===
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 102, 179);
      doc.text('NIELIT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('National Institute of Electronics & Information Technology', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      // Blue separator line
      doc.setDrawColor(0, 102, 179);
      doc.setLineWidth(0.8);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      // === TITLE ===
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Student Attendance Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;

      // === STUDENT/COURSE INFORMATION (CENTERED) ===
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(50, 50, 50);

      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 102, 179);
      doc.text(`${student.course_code}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;

      doc.setFont(undefined, 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`${student.course_name || 'Course'}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 3;

      doc.text(`Faculty: ${student.faculty || '[Faculty Name]'}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      const monthLabel = selectedMonth ? months.find(m => m.value === selectedMonth)?.label || selectedMonth : 'Overall';
      const workingDays = attendanceStats.stats.totalWorkingDays;
      doc.text(
        `Month: ${monthLabel} ${selectedYear} | Session Days: ${workingDays}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 4;

      doc.text(
        `Total Students: 1`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 7;

      // === CALENDAR TABLE ===
      const lastDay = selectedMonth ? new Date(selectedYear, parseInt(selectedMonth), 0).getDate() : 31;

      // Create attendance map
      const attendanceMap = {};
      attendanceStats.recentAttendance.forEach(record => {
        const dayNum = new Date(record.date).getDate();
        attendanceMap[dayNum] = {
          status: record.status.charAt(0).toUpperCase(),
          scanTime: record.scan_time
        };
      });

      // Header row with day numbers
      const dayWidth = (pageWidth - 2 * margin - 50) / (lastDay + 1); // +1 for P column
      const cellHeight = 5;
      let xPos = margin;

      // "Student" label
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, yPosition - cellHeight + 1, 50, cellHeight, 'F');
      doc.setDrawColor(150, 150, 150);
      doc.rect(margin, yPosition - cellHeight + 1, 50, cellHeight);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Student', margin + 2, yPosition - 1);

      // Day numbers header - always show 1-31
      xPos = margin + 50;
      for (let day = 1; day <= lastDay; day++) {
        const isSessionDay = attendanceMap[day] ? true : false;

        // Check if it's weekend (Saturday=6, Sunday=0)
        const dateObj = new Date(selectedYear, parseInt(selectedMonth) - 1, day);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

        if (isWeekend) {
          doc.setFillColor(255, 200, 200); // Light red for weekends
        } else if (isSessionDay) {
          doc.setFillColor(144, 238, 144); // Light green for session days
        } else {
          doc.setFillColor(220, 220, 220); // Gray for non-session days
        }

        doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight, 'F');
        doc.setDrawColor(150, 150, 150);
        doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight);

        doc.setFontSize(6);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);

        // Always show day number
        doc.text(day.toString(), xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

        xPos += dayWidth;
      }

      // P column header (Present count)
      doc.setFillColor(200, 200, 200);
      doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight, 'F');
      doc.setDrawColor(150, 150, 150);
      doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.text('P', xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

      yPosition += cellHeight;

      // Student row
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition - cellHeight + 1, 50, cellHeight, 'F');
      doc.setDrawColor(150, 150, 150);
      doc.rect(margin, yPosition - cellHeight + 1, 50, cellHeight);

      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`${student.roll_number} ${student.name}`, margin + 2, yPosition - 1);

      // Attendance cells
      xPos = margin + 50;
      let presentCount = 0;

      for (let day = 1; day <= lastDay; day++) {
        doc.setFillColor(255, 255, 255);
        doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight, 'F');
        doc.setDrawColor(150, 150, 150);
        doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight);

        // Check if weekend
        const dateObj = new Date(selectedYear, parseInt(selectedMonth) - 1, day);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const dayData = attendanceMap[day];
        let cellText = '-';
        let textColor = [150, 150, 150];

        if (isWeekend) {
          cellText = 'OFF';
          textColor = [150, 150, 150];
        } else if (dayData) {
          if (dayData.status === 'P') {
            cellText = '✓';
            textColor = [45, 125, 50]; // Green
            presentCount++;
            if (dayData.scanTime) {
              const scanTime = new Date(dayData.scanTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              cellText = `✓\n${scanTime}`;
            }
          } else if (dayData.status === 'A') {
            cellText = '✗';
            textColor = [198, 40, 40]; // Red
          } else if (dayData.status === 'L') {
            cellText = 'L';
            textColor = [230, 81, 0]; // Orange
          }
        }

        doc.setTextColor(...textColor);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(6);
        doc.text(cellText, xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

        xPos += dayWidth;
      }

      // Present count column
      doc.setFillColor(255, 255, 255);
      doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight, 'F');
      doc.setDrawColor(150, 150, 150);
      doc.rect(xPos, yPosition - cellHeight + 1, dayWidth, cellHeight);

      doc.setTextColor(0, 102, 179);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text(presentCount.toString(), xPos + dayWidth / 2 - 1, yPosition - 1, { align: 'center' });

      yPosition += cellHeight + 3;

      // === LEGEND ===
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(
        "Legend: ✓ Present (with scan time) | ✗ Absent | L Leave | W Weekend | H Holiday | - No Session",
        margin,
        yPosition
      );
      yPosition += 4;

      doc.setFontSize(6);
      doc.text(
        "Note: Session Days = Days when attendance was conducted. Green column headers indicate session days.",
        margin,
        yPosition
      );

      // === FOOTER ===
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on: ${new Date().toLocaleString('en-IN')}`,
        margin,
        pageHeight - 5
      );

      const monthLabelFile = selectedMonth ? months.find(m => m.value === selectedMonth)?.label || selectedMonth : 'Overall';
      doc.save(`my-attendance-${monthLabelFile}-${selectedYear}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  if (!student) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        {error ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h2 style={{ color: '#c62828', marginBottom: '10px' }}>Student Profile Not Found</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
            <p style={{ color: '#888', fontSize: '14px' }}>Please contact your admin to ensure your student record is created.</p>
            <button
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); }}
              className="btn btn-secondary"
              style={{ marginTop: '15px' }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="loading">Loading...</div>
        )}
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container" style={{ paddingTop: '20px' }}>
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/nielit-logo.svg" alt="NIELIT" style={{ height: '45px', background: 'white', padding: '5px', borderRadius: '6px' }} />
            <div>
              <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>Student Portal</h1>
              <span style={{ fontSize: '11px', opacity: '0.9' }}>QR Attendance System</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {message.text && (
          <div 
            className={`alert alert-${message.type === 'error' ? 'error' : message.type === 'info' ? 'info' : 'success'}`}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}
          >
            {message.text}
          </div>
        )}

        <div className="card" style={{ borderRadius: '12px' }}>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '2px solid #e0e0e0',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setActiveTab('scan')}
              style={{
                padding: '15px 30px',
                border: 'none',
                background: activeTab === 'scan' ? 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)' : 'transparent',
                color: activeTab === 'scan' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '600',
                borderRadius: activeTab === 'scan' ? '8px 8px 0 0' : '0',
                transition: 'all 0.3s'
              }}
            >
              📷 Mark Attendance
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              style={{
                padding: '15px 30px',
                border: 'none',
                background: activeTab === 'stats' ? 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)' : 'transparent',
                color: activeTab === 'stats' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '600',
                borderRadius: activeTab === 'stats' ? '8px 8px 0 0' : '0',
                transition: 'all 0.3s'
              }}
            >
              📊 My Attendance
            </button>
          </div>

          {activeTab === 'scan' && (
            <div className="text-center">
              <h2 style={{ marginBottom: '10px', color: '#0066B3' }}>Mark Your Attendance</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                Scan the QR code displayed by your teacher to mark attendance
              </p>

              {/* Student Info Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)', 
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '30px',
                maxWidth: '400px',
                margin: '0 auto 30px auto',
                border: '1px solid #cce5ff'
              }}>
                <div style={{ marginBottom: '10px', fontSize: '18px' }}>
                  <strong style={{ color: '#0066B3' }}>Name:</strong> {student.name}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#0066B3' }}>Roll Number:</strong> {student.roll_number}
                </div>
                <div>
                  <strong style={{ color: '#0066B3' }}>Course:</strong> {student.course_code ? `${student.course_code} - ${student.course_name || ''}` : 'Not Assigned'}
                </div>
              </div>

              {attendanceMarked ? (
                <div style={{
                  padding: '40px',
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: '1px solid #8DC63F'
                }}>
                  <div style={{ fontSize: '60px', marginBottom: '10px' }}>✅</div>
                  <h3 style={{ color: '#2e7d32', marginBottom: '10px' }}>Attendance Marked!</h3>
                  {scanTime && (
                    <p style={{ color: '#666' }}>
                      Marked at: {scanTime.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  {/* Scanner Container */}
                  <div 
                    id="qr-reader" 
                    style={{ 
                      width: '100%', 
                      maxWidth: '400px',
                      minHeight: scanning ? '300px' : '0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: scanning ? '3px solid #0066B3' : 'none'
                    }}
                  />

                  {!scanning ? (
                    <button 
                      onClick={startScanner} 
                      className="btn btn-primary"
                      style={{ fontSize: '18px', padding: '15px 40px' }}
                    >
                      📷 Start Camera to Scan
                    </button>
                  ) : (
                    <button 
                      onClick={stopScanner} 
                      className="btn btn-secondary"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
              )}

              <div className="alert alert-info" style={{ 
                marginTop: '20px',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                border: '1px solid #0066B3',
                borderRadius: '12px',
                textAlign: 'left'
              }}>
                <strong style={{ color: '#0066B3' }}>How to mark attendance:</strong>
                <ol style={{ marginTop: '10px', marginLeft: '20px' }}>
                  <li>Click "Start Camera to Scan"</li>
                  <li>Point your camera at the QR code shown by your teacher</li>
                  <li>Your attendance will be marked automatically</li>
                  <li>You can only mark attendance once per day</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: '#0066B3', textAlign: 'center' }}>My Attendance Statistics</h2>
              
              {/* Month/Year Filter */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginBottom: '25px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                  <label style={{ fontSize: '14px', color: '#666' }}>Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ 
                      padding: '10px 15px', 
                      borderRadius: '8px', 
                      border: '2px solid #0066B3',
                      background: 'white',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
                  <label style={{ fontSize: '14px', color: '#666' }}>Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{ 
                      padding: '10px 15px', 
                      borderRadius: '8px', 
                      border: '2px solid #0066B3',
                      background: 'white',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              {loadingStats ? (
                <div className="loading">Loading attendance data...</div>
              ) : attendanceStats ? (
                <>
                  {/* Period Label */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '20px',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #0066B3 0%, #00A0E3 100%)',
                    borderRadius: '25px',
                    display: 'inline-block',
                    width: '100%'
                  }}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>
                      📅 {attendanceStats.monthName} {selectedYear}
                    </span>
                  </div>

                  {/* Export Button */}
                  <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={downloadMyPDF}
                      className="btn btn-secondary"
                      disabled={!attendanceStats.recentAttendance || attendanceStats.recentAttendance.length === 0}
                      style={{ fontSize: '14px' }}
                    >
                      📄 Download as PDF
                    </button>
                  </div>

                  {/* Statistics Cards */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '15px',
                    marginBottom: '25px'
                  }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      border: '1px solid #8DC63F'
                    }}>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2e7d32' }}>
                        {attendanceStats.stats.presentDays}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Days Present</div>
                    </div>
                    
                    <div style={{ 
                      background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      border: '1px solid #E91E8C'
                    }}>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#c62828' }}>
                        {attendanceStats.stats.absentDays}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Days Absent</div>
                    </div>
                    
                    <div style={{ 
                      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      border: '1px solid #ff9800'
                    }}>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#e65100' }}>
                        {attendanceStats.stats.leaveDays}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Leaves</div>
                    </div>
                    
                    <div style={{ 
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      border: '1px solid #0066B3'
                    }}>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0066B3' }}>
                        {attendanceStats.stats.totalWorkingDays}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Working Days</div>
                    </div>
                  </div>

                  {/* Percentage Card */}
                  <div style={{ 
                    background: attendanceStats.stats.percentage >= 75 
                      ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                      : attendanceStats.stats.percentage >= 50 
                        ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
                        : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                    padding: '25px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    marginBottom: '25px',
                    border: attendanceStats.stats.percentage >= 75 
                      ? '2px solid #8DC63F'
                      : attendanceStats.stats.percentage >= 50 
                        ? '2px solid #ff9800'
                        : '2px solid #E91E8C'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Attendance Percentage</div>
                    <div style={{ 
                      fontSize: '48px', 
                      fontWeight: 'bold', 
                      color: attendanceStats.stats.percentage >= 75 
                        ? '#2e7d32'
                        : attendanceStats.stats.percentage >= 50 
                          ? '#e65100'
                          : '#c62828'
                    }}>
                      {attendanceStats.stats.percentage}%
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      marginTop: '10px',
                      padding: '5px 15px',
                      borderRadius: '20px',
                      display: 'inline-block',
                      background: attendanceStats.stats.percentage >= 75 
                        ? '#8DC63F'
                        : attendanceStats.stats.percentage >= 50 
                          ? '#ff9800'
                          : '#E91E8C',
                      color: 'white'
                    }}>
                      {attendanceStats.stats.percentage >= 75 
                        ? '✓ Good Standing'
                        : attendanceStats.stats.percentage >= 50 
                          ? '⚠ Needs Improvement'
                          : '✗ Below Required'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                      * Excludes Saturdays, Sundays & Public Holidays
                    </div>
                  </div>

                  {/* Monthly Breakdown Chart */}
                  {attendanceStats.monthlySummary && attendanceStats.monthlySummary.length > 0 && !selectedMonth && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      marginBottom: '25px',
                      border: '1px solid #cce5ff'
                    }}>
                      <h3 style={{ color: '#0066B3', marginBottom: '20px', fontSize: '16px', textAlign: 'center' }}>
                        📊 Monthly Attendance Overview
                      </h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: '10px'
                      }}>
                        {attendanceStats.monthlySummary.map((month) => (
                          <div 
                            key={month.month}
                            onClick={() => setSelectedMonth(month.month.toString())}
                            style={{ 
                              background: 'white',
                              padding: '15px 10px',
                              borderRadius: '10px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              border: month.percentage >= 75 
                                ? '2px solid #8DC63F'
                                : month.percentage >= 50 
                                  ? '2px solid #ff9800'
                                  : '2px solid #E91E8C',
                              transition: 'transform 0.2s',
                              ':hover': { transform: 'scale(1.05)' }
                            }}
                          >
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#666', 
                              marginBottom: '5px',
                              fontWeight: '600'
                            }}>
                              {month.monthName}
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold',
                              color: month.percentage >= 75 
                                ? '#2e7d32'
                                : month.percentage >= 50 
                                  ? '#e65100'
                                  : '#c62828'
                            }}>
                              {month.percentage}%
                            </div>
                            <div style={{ fontSize: '10px', color: '#888' }}>
                              {month.present}/{month.workingDays}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '11px', color: '#888', marginTop: '15px', textAlign: 'center' }}>
                        Click on a month to see detailed attendance
                      </p>
                    </div>
                  )}

                  {/* Holidays in selected month */}
                  {attendanceStats.holidays && attendanceStats.holidays.length > 0 && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      marginBottom: '25px',
                      border: '1px solid #9c27b0'
                    }}>
                      <h3 style={{ color: '#7b1fa2', marginBottom: '15px', fontSize: '16px' }}>
                        📅 {selectedMonth ? 'Holidays This Month' : 'Upcoming Holidays'}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {attendanceStats.holidays.map((holiday, idx) => (
                          <span key={idx} style={{
                            background: 'white',
                            padding: '8px 15px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            color: '#7b1fa2'
                          }}>
                            {new Date(holiday).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short'
                            })}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Attendance */}
                  {attendanceStats.recentAttendance && attendanceStats.recentAttendance.length > 0 && (
                    <div>
                      <h3 style={{ color: '#0066B3', marginBottom: '15px' }}>
                        {selectedMonth ? `Attendance Records - ${attendanceStats.monthName}` : 'Recent Attendance History'}
                      </h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Day</th>
                              <th>Status</th>
                              <th>Time (IST)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceStats.recentAttendance.map((record, idx) => (
                              <tr key={idx}>
                                <td>{new Date(record.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}</td>
                                <td>{new Date(record.date).toLocaleDateString('en-IN', {
                                  weekday: 'short'
                                })}</td>
                                <td>
                                  <span className={`status-badge status-${record.status}`}>
                                    {record.status}
                                  </span>
                                </td>
                                <td>
                                  {record.scan_time 
                                    ? new Date(record.scan_time).toLocaleTimeString('en-IN', {
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
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center" style={{ padding: '40px', color: '#666' }}>
                  No attendance records found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
