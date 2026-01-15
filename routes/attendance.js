import express from 'express';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Scan QR code and mark attendance
router.post('/scan', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { qr_payload, teacher_session_id } = req.body;

        if (!qr_payload) {
            return res.status(400).json({ ok: false, reason: 'missing_qr_payload' });
        }

        // Parse QR payload: format is "roll_number|timestamp_ms"
        const parts = qr_payload.split('|');
        if (parts.length !== 2) {
            return res.status(400).json({ ok: false, reason: 'invalid_qr_format' });
        }

        const roll_number = parts[0];
        const qr_generation_ts_ms = parseInt(parts[1], 10);

        if (isNaN(qr_generation_ts_ms)) {
            return res.status(400).json({ ok: false, reason: 'invalid_timestamp' });
        }

        const server_scan_time = new Date();
        const server_scan_time_ms = server_scan_time.getTime();
        const qr_generation_ts = new Date(qr_generation_ts_ms);
        
        // Calculate time difference in seconds
        const delta_seconds = Math.abs(server_scan_time_ms - qr_generation_ts_ms) / 1000;

        // Get student by roll number
        const studentResult = await db.query(
            'SELECT id, roll_number, name, class, section FROM students WHERE roll_number = $1',
            [roll_number]
        );

        if (studentResult.rows.length === 0) {
            // Log audit entry
            const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const auditDate = new Date(server_scan_time.toISOString().split('T')[0] + 'T00:00:00.000Z');
            await db.query(
                'INSERT INTO attendance_audit (id, roll_number, [date], qr_generation_ts, server_scan_time, scanner_id, result, reason, delta_seconds, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [auditId, roll_number, auditDate, qr_generation_ts,
                 server_scan_time, req.user.id, 'student_not_found', 'Roll number not found in database', delta_seconds, server_scan_time]
            );
            
            return res.status(404).json({ ok: false, reason: 'student_not_found', delta_seconds });
        }

        const student = studentResult.rows[0];

        // Validate timestamp (15 second window)
        if (delta_seconds > 15) {
            // Log audit entry
            const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const auditDate = new Date(server_scan_time.toISOString().split('T')[0] + 'T00:00:00.000Z');
            await db.query(
                'INSERT INTO attendance_audit (id, student_id, roll_number, [date], qr_generation_ts, server_scan_time, scanner_id, result, reason, delta_seconds, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [auditId, student.id, roll_number, auditDate,
                 qr_generation_ts, server_scan_time, req.user.id, 'timestamp_out_of_range',
                 `Time difference ${delta_seconds.toFixed(1)}s exceeds 15s limit`, delta_seconds, server_scan_time]
            );
            
            return res.status(400).json({ 
                ok: false, 
                reason: 'timestamp_out_of_range', 
                delta_seconds: parseFloat(delta_seconds.toFixed(1))
            });
        }

        const today = server_scan_time.toISOString().split('T')[0];
        const todayDate = new Date(today + 'T00:00:00.000Z');

        console.log('Checking for existing attendance:', { student_id: student.id, date: today, todayDate });

        // Check if attendance already exists for today
        // Use date comparison function to handle date-only comparison
        const existingAttendance = await db.query(
            'SELECT id, scan_time, finalized FROM attendance WHERE student_id = $1 AND DateValue([date]) = DateValue($2)',
            [student.id, todayDate]
        );

        console.log('Existing attendance check result:', existingAttendance.rows.length, 'records found');

        if (existingAttendance.rows.length > 0) {
            const existing = existingAttendance.rows[0];
            
            // Log audit entry
            const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await db.query(
                'INSERT INTO attendance_audit (id, student_id, roll_number, [date], qr_generation_ts, server_scan_time, scanner_id, result, reason, delta_seconds, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [auditId, student.id, roll_number, todayDate, qr_generation_ts, server_scan_time,
                 req.user.id, 'duplicate', 'Attendance already marked for today', delta_seconds, server_scan_time]
            );
            
            return res.status(409).json({ 
                ok: false, 
                reason: existing.finalized ? 'already_finalized' : 'already_scanned',
                existing: { scan_time: existing.scan_time }
            });
        }

        // Insert new attendance record
        const attendanceId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.query(
            'INSERT INTO attendance (id, student_id, [date], status, scan_time, scanner_id, finalized, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [attendanceId, student.id, todayDate, 'present', server_scan_time, req.user.id, 0, server_scan_time, server_scan_time]
        );

        // Log successful audit entry
        const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.query(
            'INSERT INTO attendance_audit (id, student_id, roll_number, [date], qr_generation_ts, server_scan_time, scanner_id, result, reason, delta_seconds, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [auditId, student.id, roll_number, todayDate, qr_generation_ts, server_scan_time,
             req.user.id, 'accepted', 'Attendance marked successfully', delta_seconds, server_scan_time]
        );

        res.json({
            ok: true,
            student: {
                id: student.id,
                roll_number: student.roll_number,
                name: student.name,
                class: student.class,
                section: student.section
            },
            scan_time: server_scan_time.toISOString(),
            message: 'accepted'
        });

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ ok: false, reason: 'internal_error', error: error.message });
    }
});

// Get daily attendance for a specific date
router.get('/daily', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { date, course_code } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Get students - filter by course_code if provided
        let studentsQuery = 'SELECT id, roll_number, name, course_code FROM students';
        const params = [];

        // If teacher (not admin) and no course selected, get teacher's course
        let effectiveCourseCode = course_code;
        if (req.user.role === 'teacher' && !course_code) {
            // Get teacher's course
            const courseResult = await db.query(
                'SELECT course_code FROM courses WHERE teacher_name = $1',
                [req.user.username]
            );
            if (courseResult.rows.length > 0) {
                effectiveCourseCode = courseResult.rows[0].course_code;
            }
        }

        if (effectiveCourseCode) {
            studentsQuery += ' WHERE course_code = $' + (params.length + 1);
            params.push(effectiveCourseCode);
        } else if (req.user.role === 'teacher') {
            // Teacher but no course assigned - return empty list
            studentsQuery += ' WHERE 1=0';
        }

        studentsQuery += ' ORDER BY roll_number';
        
        const studentsResult = await db.query(studentsQuery, params);
        
        // Then get attendance records for the date
        // Create a Date object at midnight for comparison
        const dateObj = new Date(targetDate + 'T00:00:00.000Z');
        const attendanceResult = await db.query(
            'SELECT student_id, status, scan_time, finalized FROM attendance WHERE [date] = $1',
            [dateObj]
        );
        
        // Merge the data
        const attendanceMap = {};
        attendanceResult.rows.forEach(att => {
            // MS Access stores time without timezone info - it's already in local time (IST)
            // We need to return it as-is in ISO format without timezone conversion
            let scanTimeISO = null;
            if (att.scan_time) {
                const scanDate = new Date(att.scan_time);
                // The scan_time from MS Access is already in IST (server local time)
                // Add IST offset info (+05:30) so client knows it's IST
                scanTimeISO = scanDate.toISOString();
            }
            attendanceMap[att.student_id] = {
                status: att.status,
                scan_time: scanTimeISO,
                finalized: att.finalized
            };
        });
        
        const students = studentsResult.rows.map(student => ({
            student_id: student.id,
            roll_number: student.roll_number,
            name: student.name,
            course_code: student.course_code,
            status: attendanceMap[student.id]?.status || 'absent',
            scan_time: attendanceMap[student.id]?.scan_time || null,
            finalized: attendanceMap[student.id]?.finalized || false
        }));

        res.json({
            date: targetDate,
            students: students,
            finalized: students.length > 0 ? students[0].finalized : false
        });
    } catch (error) {
        console.error('Get daily attendance error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Helper function to check if a date is a holiday (Indian national holidays 2025)
const getHolidays2025 = () => {
    return [
        '2025-01-26', // Republic Day
        '2025-03-14', // Holi
        '2025-04-14', // Ambedkar Jayanti
        '2025-04-18', // Good Friday
        '2025-05-01', // May Day
        '2025-05-12', // Buddha Purnima
        '2025-06-07', // Eid ul-Fitr (approximate)
        '2025-08-15', // Independence Day
        '2025-08-16', // Janmashtami
        '2025-10-02', // Gandhi Jayanti
        '2025-10-20', // Dussehra
        '2025-10-21', // Dussehra
        '2025-11-01', // Diwali
        '2025-11-05', // Bhai Dooj
        '2025-12-25', // Christmas
    ];
};

// Calculate working days in a month (excluding weekends and holidays)
const calculateMonthWorkingDays = (year, month) => {
    const holidays = getHolidays2025();
    let workingDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        
        // Exclude Saturday (6) and Sunday (0), and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
            workingDays++;
        }
    }
    
    return workingDays;
};

// Get monthly attendance report
router.get('/monthly', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { month, year, course_code } = req.query;
        const today = new Date();
        const targetMonth = parseInt(month) || (today.getMonth() + 1);
        const targetYear = parseInt(year) || today.getFullYear();
        
        // Calculate date range for the month
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
        const daysInMonth = endDate.getDate();
        
        // Get students - filter by course_code if provided
        let studentsQuery = 'SELECT id, roll_number, name, course_code FROM students';
        const params = [];

        // If faculty (not admin) and no course selected, get faculty's course
        let effectiveCourseCode = course_code;
        if (req.user.role === 'teacher' && !course_code) {
            // Get faculty's course
            const courseResult = await db.query(
                'SELECT course_code FROM courses WHERE teacher_name = $1',
                [req.user.username]
            );
            if (courseResult.rows.length > 0) {
                effectiveCourseCode = courseResult.rows[0].course_code;
            }
        }

        if (effectiveCourseCode) {
            studentsQuery += ' WHERE course_code = $' + (params.length + 1);
            params.push(effectiveCourseCode);
        } else if (req.user.role === 'teacher') {
            // Faculty but no course assigned - return empty list
            studentsQuery += ' WHERE 1=0';
        }

        studentsQuery += ' ORDER BY roll_number';
        
        const studentsResult = await db.query(studentsQuery, params);
        
        // Get all attendance records for the month
        const attendanceResult = await db.query(
            'SELECT student_id, [date], status, scan_time FROM attendance WHERE [date] >= $1 AND [date] <= $2',
            [startDate, endDate]
        );
        
        // Get unique dates when attendance sessions were conducted (working days = days with attendance records)
        const sessionDates = new Set();
        attendanceResult.rows.forEach(record => {
            const dateStr = new Date(record.date).toISOString().split('T')[0];
            sessionDates.add(dateStr);
        });
        const workingDays = sessionDates.size;
        
        // Build attendance map per student with daily breakdown
        const studentAttendance = {};
        attendanceResult.rows.forEach(record => {
            if (!studentAttendance[record.student_id]) {
                studentAttendance[record.student_id] = { present: 0, absent: 0, leave: 0, dailyRecords: {} };
            }
            const dateStr = new Date(record.date).toISOString().split('T')[0];
            const day = new Date(record.date).getDate();
            
            if (record.status === 'present') {
                studentAttendance[record.student_id].present++;
            } else if (record.status === 'absent') {
                studentAttendance[record.student_id].absent++;
            } else if (record.status === 'leave') {
                studentAttendance[record.student_id].leave++;
            }
            
            // Store daily record with scan time
            studentAttendance[record.student_id].dailyRecords[day] = {
                date: dateStr,
                status: record.status,
                scan_time: record.scan_time
            };
        });
        
        // Generate daily data array (1 to daysInMonth)
        const holidays = getHolidays2025();
        const dailyInfo = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(targetYear, targetMonth - 1, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            dailyInfo.push({
                day,
                dateStr,
                dayName: dayNames[dayOfWeek],
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isHoliday: holidays.includes(dateStr),
                hasSession: sessionDates.has(dateStr)
            });
        }
        
        // Calculate stats for each student
        const students = studentsResult.rows.map(student => {
            const att = studentAttendance[student.id] || { present: 0, absent: 0, leave: 0, dailyRecords: {} };
            const percentage = workingDays > 0 ? ((att.present / workingDays) * 100).toFixed(1) : 0;
            
            // Build daily attendance array for this student
            const daily = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const record = att.dailyRecords[day];
                daily.push({
                    day,
                    status: record ? record.status : null,
                    scan_time: record ? record.scan_time : null
                });
            }
            
            return {
                student_id: student.id,
                roll_number: student.roll_number,
                name: student.name,
                course_code: student.course_code,
                present: att.present,
                absent: workingDays - att.present - att.leave, // Calculate absent as remaining session days
                leave: att.leave,
                percentage: parseFloat(percentage),
                daily // Array of daily attendance with scan times
            };
        });
        
        // Overall statistics
        const totalPresent = students.reduce((sum, s) => sum + s.present, 0);
        const totalStudents = students.length;
        const overallPercentage = (totalStudents > 0 && workingDays > 0)
            ? ((totalPresent / (totalStudents * workingDays)) * 100).toFixed(1)
            : 0;

        res.json({
            ok: true,
            month: targetMonth,
            year: targetYear,
            monthName: new Date(targetYear, targetMonth - 1, 1).toLocaleString('en-IN', { month: 'long' }),
            daysInMonth,
            workingDays,
            totalStudents,
            overallPercentage: parseFloat(overallPercentage),
            students,
            dailyInfo, // Info about each day of the month
            holidays: holidays.filter(h => {
                const d = new Date(h);
                return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
            })
        });
    } catch (error) {
        console.error('Get monthly attendance error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Finalize attendance for a date
router.post('/finalize', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { date, class: className, section } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];

        let query = 'UPDATE attendance SET finalized = 1 WHERE [date] = $1';
        const dateObj = new Date(targetDate + 'T00:00:00.000Z');
        const params = [dateObj];

        if (className) {
            query += ' AND student_id IN (SELECT id FROM students WHERE class = $' + (params.length + 1) + ')';
            params.push(className);
            
            if (section) {
                query += ' AND student_id IN (SELECT id FROM students WHERE class = $' + params.length + ' AND section = $' + (params.length + 1) + ')';
                params.push(section);
            }
        }

        await db.query(query, params);

        res.json({
            ok: true,
            finalized_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Finalize attendance error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Export attendance as CSV
router.get('/export', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { date, class: className, section } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // First get all students
        let studentsQuery = 'SELECT id, roll_number, name, class, section FROM students';
        const params = [];

        if (className) {
            studentsQuery += ' WHERE class = $' + (params.length + 1);
            params.push(className);
            
            if (section) {
                studentsQuery += ' AND section = $' + (params.length + 1);
                params.push(section);
            }
        }

        studentsQuery += ' ORDER BY roll_number';
        
        const studentsResult = await db.query(studentsQuery, params);
        
        // Then get attendance records for the date
        const dateObj = new Date(targetDate + 'T00:00:00.000Z');
        const attendanceResult = await db.query(
            'SELECT student_id, status, scan_time FROM attendance WHERE [date] = $1',
            [dateObj]
        );
        
        // Merge the data
        const attendanceMap = {};
        attendanceResult.rows.forEach(att => {
            attendanceMap[att.student_id] = att;
        });
        
        const result = {
            rows: studentsResult.rows.map(student => ({
                roll_number: student.roll_number,
                name: student.name,
                class: student.class,
                section: student.section,
                status: attendanceMap[student.id]?.status || 'absent',
                scan_time: attendanceMap[student.id]?.scan_time || null
            }))
        };

        // Generate CSV
        let csv = 'Roll Number,Name,Class,Section,Status,Scan Time (IST)\n';
        result.rows.forEach(row => {
            const scanTimeFormatted = row.scan_time 
                ? new Date(row.scan_time).toLocaleString('en-IN', { 
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata'
                  })
                : '';
            csv += `${row.roll_number},${row.name},${row.class || ''},${row.section || ''},${row.status},${scanTimeFormatted}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${targetDate}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export attendance error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Student marks their own attendance by scanning teacher's QR code
router.post('/mark-self', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const { qr_payload } = req.body;

        if (!qr_payload) {
            return res.status(400).json({ ok: false, reason: 'missing_qr_payload' });
        }

        // Parse QR payload: format is "ATTENDANCE|teacher_id|timestamp_ms"
        const parts = qr_payload.split('|');
        if (parts.length !== 3 || parts[0] !== 'ATTENDANCE') {
            return res.status(400).json({ ok: false, reason: 'invalid_qr_format' });
        }

        const teacher_id = parts[1];
        const qr_generation_ts_ms = parseInt(parts[2], 10);

        if (isNaN(qr_generation_ts_ms)) {
            return res.status(400).json({ ok: false, reason: 'invalid_timestamp' });
        }

        const server_scan_time = new Date();
        const server_scan_time_ms = server_scan_time.getTime();
        const qr_generation_ts = new Date(qr_generation_ts_ms);
        
        // Calculate time difference in seconds
        const delta_seconds = Math.abs(server_scan_time_ms - qr_generation_ts_ms) / 1000;

        // Get student info from the authenticated user (including course_code)
        const studentResult = await db.query(
            'SELECT id, roll_number, name, course_code FROM students WHERE user_id = $1',
            [req.user.id]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ ok: false, reason: 'student_not_found' });
        }

        const student = studentResult.rows[0];

        // Get teacher's username to find their course
        const teacherResult = await db.query(
            'SELECT username FROM users WHERE id = $1',
            [teacher_id]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({ ok: false, reason: 'invalid_teacher_qr' });
        }

        const teacherUsername = teacherResult.rows[0].username;

        // Find the course that this teacher is assigned to
        const courseResult = await db.query(
            'SELECT course_code, course_name FROM courses WHERE teacher_name = $1 OR teacher_name = $2',
            [teacherUsername, teacherUsername.charAt(0).toUpperCase() + teacherUsername.slice(1)]
        );

        // Check if student belongs to the teacher's course
        if (courseResult.rows.length > 0) {
            const teacherCourse = courseResult.rows[0];
            if (student.course_code !== teacherCourse.course_code) {
                return res.status(403).json({ 
                    ok: false, 
                    reason: 'not_enrolled',
                    message: `You are not enrolled in course ${teacherCourse.course_code}. Your course is ${student.course_code || 'not assigned'}.`
                });
            }
        }

        // Validate timestamp (15 second window)
        if (delta_seconds > 15) {
            const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const auditDate = new Date(server_scan_time.toISOString().split('T')[0] + 'T00:00:00.000Z');
            await db.query(
                'INSERT INTO attendance_audit (id, student_id, roll_number, [date], qr_generation_ts, server_scan_time, scanner_id, result, reason, delta_seconds, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [auditId, student.id, student.roll_number, auditDate,
                 qr_generation_ts, server_scan_time, teacher_id, 'timestamp_out_of_range',
                 `Time difference ${delta_seconds.toFixed(1)}s exceeds 15s limit`, delta_seconds, server_scan_time]
            );
            
            return res.status(400).json({ 
                ok: false, 
                reason: 'timestamp_out_of_range', 
                delta_seconds: parseFloat(delta_seconds.toFixed(1))
            });
        }

        const today = server_scan_time.toISOString().split('T')[0];
        const todayDate = new Date(today + 'T00:00:00.000Z');

        // Check if attendance already exists for today
        const existingAttendance = await db.query(
            'SELECT id, scan_time, finalized FROM attendance WHERE student_id = $1 AND DateValue([date]) = DateValue($2)',
            [student.id, todayDate]
        );

        if (existingAttendance.rows.length > 0) {
            const existing = existingAttendance.rows[0];
            
            return res.status(409).json({ 
                ok: false, 
                reason: existing.finalized ? 'already_finalized' : 'already_marked',
                existing: { scan_time: existing.scan_time }
            });
        }

        // Insert new attendance record
        const attendanceId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.query(
            'INSERT INTO attendance (id, student_id, [date], status, scan_time, scanner_id, finalized, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [attendanceId, student.id, todayDate, 'present', server_scan_time, teacher_id, 0, server_scan_time, server_scan_time]
        );

        // Log successful audit entry
        const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.query(
            'INSERT INTO attendance_audit (id, student_id, roll_number, [date], qr_generation_ts, server_scan_time, scanner_id, result, reason, delta_seconds, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [auditId, student.id, student.roll_number, todayDate, qr_generation_ts, server_scan_time,
             teacher_id, 'accepted', 'Self-attendance marked successfully', delta_seconds, server_scan_time]
        );

        res.json({
            ok: true,
            student: {
                id: student.id,
                roll_number: student.roll_number,
                name: student.name,
                course_code: student.course_code
            },
            scan_time: server_scan_time.toISOString(),
            message: 'Attendance marked successfully!'
        });

    } catch (error) {
        console.error('Mark self attendance error:', error);
        res.status(500).json({ ok: false, reason: 'internal_error', error: error.message });
    }
});

export default router;
