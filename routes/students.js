import express from 'express';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

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

// Calculate working days between two dates (excluding weekends and holidays)
const calculateWorkingDays = (startDate, endDate) => {
    const holidays = getHolidays2025();
    let workingDays = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split('T')[0];
        
        // Exclude Saturday (6) and Sunday (0), and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
            workingDays++;
        }
        
        current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
};

// Calculate working days in a specific month
const calculateMonthWorkingDays = (year, month, upToDay = null) => {
    const holidays = getHolidays2025();
    let workingDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    const lastDay = upToDay || daysInMonth;
    
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
            workingDays++;
        }
    }
    
    return workingDays;
};

// Get student's attendance statistics with optional month filter
router.get('/me/attendance-stats', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const { month, year } = req.query;
        const today = new Date();
        const targetMonth = month ? parseInt(month) : null;
        const targetYear = year ? parseInt(year) : today.getFullYear();
        
        // Get student info
        const studentResult = await db.query(
            'SELECT s.id, s.roll_number, s.name, s.class, s.section, s.year FROM students s INNER JOIN users u ON s.user_id = u.id WHERE u.id = $1',
            [req.user.id]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'student_not_found' });
        }

        const student = studentResult.rows[0];
        
        // Get attendance records - filtered by month if specified
        let attendanceQuery = 'SELECT [date], status, scan_time FROM attendance WHERE student_id = $1';
        const queryParams = [student.id];
        
        if (targetMonth) {
            const startDate = new Date(targetYear, targetMonth - 1, 1);
            const endDate = new Date(targetYear, targetMonth, 0);
            attendanceQuery += ' AND [date] >= $2 AND [date] <= $3';
            queryParams.push(startDate, endDate);
        }
        
        attendanceQuery += ' ORDER BY [date] DESC';
        
        const attendanceResult = await db.query(attendanceQuery, queryParams);
        const attendanceRecords = attendanceResult.rows;
        
        // Calculate statistics
        const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
        const leaveDays = attendanceRecords.filter(r => r.status === 'leave').length;
        
        let totalWorkingDays, absentDays;
        
        if (targetMonth) {
            // Calculate working days for the specific month
            if (targetYear === today.getFullYear() && targetMonth === (today.getMonth() + 1)) {
                // Current month - only count up to today
                totalWorkingDays = calculateMonthWorkingDays(targetYear, targetMonth, today.getDate());
            } else {
                totalWorkingDays = calculateMonthWorkingDays(targetYear, targetMonth);
            }
            absentDays = totalWorkingDays - presentDays - leaveDays;
        } else {
            // Overall - from academic year start
            const currentYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
            const academicYearStart = new Date(`${currentYear}-07-01`);
            
            let effectiveStartDate = academicYearStart;
            if (attendanceRecords.length > 0) {
                const firstRecordDate = new Date(attendanceRecords[attendanceRecords.length - 1].date);
                if (firstRecordDate > academicYearStart) {
                    effectiveStartDate = firstRecordDate;
                }
            }
            
            totalWorkingDays = calculateWorkingDays(effectiveStartDate, today);
            absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
        }
        
        // Calculate percentage
        const percentage = totalWorkingDays > 0 
            ? ((presentDays / totalWorkingDays) * 100).toFixed(1)
            : 0;

        // Format attendance records for display
        const recentAttendance = attendanceRecords.slice(0, 31).map(r => ({
            date: new Date(r.date).toISOString().split('T')[0],
            status: r.status,
            scan_time: r.scan_time ? new Date(r.scan_time).toISOString() : null
        }));

        // Get holidays list for display
        const holidays = getHolidays2025();
        let relevantHolidays;
        
        if (targetMonth) {
            relevantHolidays = holidays.filter(h => {
                const d = new Date(h);
                return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
            });
        } else {
            relevantHolidays = holidays.filter(h => new Date(h) >= today).slice(0, 5);
        }

        // Generate monthly summary for the year
        const monthlySummary = [];
        for (let m = 1; m <= 12; m++) {
            if (targetYear === today.getFullYear() && m > today.getMonth() + 1) break;
            
            const monthStart = new Date(targetYear, m - 1, 1);
            const monthEnd = new Date(targetYear, m, 0);
            
            const monthRecords = attendanceRecords.filter(r => {
                const d = new Date(r.date);
                return d >= monthStart && d <= monthEnd;
            });
            
            const monthPresent = monthRecords.filter(r => r.status === 'present').length;
            const monthWorkingDays = (targetYear === today.getFullYear() && m === today.getMonth() + 1)
                ? calculateMonthWorkingDays(targetYear, m, today.getDate())
                : calculateMonthWorkingDays(targetYear, m);
            
            monthlySummary.push({
                month: m,
                monthName: new Date(targetYear, m - 1, 1).toLocaleString('en-IN', { month: 'short' }),
                present: monthPresent,
                workingDays: monthWorkingDays,
                percentage: monthWorkingDays > 0 ? parseFloat(((monthPresent / monthWorkingDays) * 100).toFixed(1)) : 0
            });
        }

        res.json({
            ok: true,
            filterMonth: targetMonth,
            filterYear: targetYear,
            monthName: targetMonth ? new Date(targetYear, targetMonth - 1, 1).toLocaleString('en-IN', { month: 'long' }) : 'Overall',
            stats: {
                totalWorkingDays,
                presentDays,
                absentDays: Math.max(0, absentDays),
                leaveDays,
                percentage: parseFloat(percentage)
            },
            monthlySummary,
            recentAttendance,
            holidays: relevantHolidays,
            allHolidays: getHolidays2025()
        });
    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Get student profile (for logged-in student)
router.get('/me', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const result = await db.query(
            'SELECT s.id, s.roll_number, s.name, s.course_code FROM students s INNER JOIN users u ON s.user_id = u.id WHERE u.id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'student_not_found' });
        }

        const student = result.rows[0];

        // Get course name if course_code exists
        if (student.course_code) {
            const courseResult = await db.query(
                'SELECT course_name FROM courses WHERE course_code = $1',
                [student.course_code]
            );
            if (courseResult.rows.length > 0) {
                student.course_name = courseResult.rows[0].course_name;
            }
        }

        res.json(student);
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Get all students (for teacher/admin)
router.get('/', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { class: className, section } = req.query;
        
        let query = 'SELECT s.id, s.roll_number, s.name, s.class, s.section, s.year FROM students s ORDER BY s.roll_number';
        const params = [];

        if (className) {
            query = 'SELECT s.id, s.roll_number, s.name, s.class, s.section, s.year FROM students s WHERE s.class = $1';
            params.push(className);
            
            if (section) {
                query += ' AND s.section = $2';
                params.push(section);
            }
            query += ' ORDER BY s.roll_number';
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;
