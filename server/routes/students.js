import express from 'express';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Helper: normalize course codes input to array of trimmed strings (or empty array)
function normalizeCourseCodes(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(c => c && c.toString().trim()).filter(Boolean);
    return input.toString().split(/[;,|]+/).map(s => s.trim()).filter(Boolean);
}

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
            'SELECT s.id, s.roll_number, s.name, s.course_code FROM students s INNER JOIN users u ON s.user_id = u.id WHERE u.id = $1',
            [req.user.id]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'student_not_found' });
        }

        const student = studentResult.rows[0];
        
        // Get attendance records - filtered by month if specified
        let attendanceQuery = 'SELECT "date", status, scan_time FROM attendance WHERE student_id = $1';
        const queryParams = [student.id];
        
        if (targetMonth) {
            const startDate = new Date(targetYear, targetMonth - 1, 1);
            const endDate = new Date(targetYear, targetMonth, 0);
            attendanceQuery += ' AND DATE("date") >= DATE($2) AND DATE("date") <= DATE($3)';
            queryParams.push(startDate, endDate);
        }
        
        attendanceQuery += ' ORDER BY "date" DESC';
        
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

        // Fetch enrolled courses from join table
        const sc = await db.query('SELECT course_code FROM student_courses WHERE student_id = $1', [student.id]);
        student.course_codes = sc.rows.map(r => r.course_code);

        // Fetch course names for enrolled courses
        if (student.course_codes && student.course_codes.length > 0) {
            const placeholders = student.course_codes.map((_, i) => `$${i+1}`).join(',');
            const courseResult = await db.query(`SELECT course_code, course_name FROM courses WHERE course_code IN (${placeholders})`, student.course_codes);
            student.courses = courseResult.rows;
        } else if (student.course_code) {
            // Fallback to legacy single course
            const courseResult = await db.query('SELECT course_name FROM courses WHERE course_code = $1', [student.course_code]);
            if (courseResult.rows.length > 0) student.courses = [courseResult.rows[0]];
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
        
        // Join with users to include generated username
        let query = 'SELECT s.id, s.roll_number, s.name, s.course_code, u.username FROM students s INNER JOIN users u ON s.user_id = u.id ORDER BY s.roll_number';
        const params = [];

        if (className) {
            // The schema doesn't include `class`/`section`. Treat `class` query param as `course_code` for filtering.
            query = 'SELECT s.id, s.roll_number, s.name, s.course_code, u.username FROM students s INNER JOIN users u ON s.user_id = u.id WHERE s.course_code = $1';
            params.push(className);
            // `section` not supported by current schema; ignore if provided.
            query += ' ORDER BY s.roll_number';
        }

        const result = await db.query(query, params);
        const students = result.rows;

        // Fetch course codes for each student and attach
        for (const s of students) {
            const sc = await db.query('SELECT course_code FROM student_courses WHERE student_id = $1', [s.id]);
            s.course_codes = sc.rows.map(r => r.course_code);
        }

        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Create a student (teacher can add students for their course)
router.post('/', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        let { roll_number, name, course_code, course_codes, password } = req.body;
        // Normalize/trim roll number to avoid accidental duplicates due to whitespace or numeric types
        roll_number = roll_number !== undefined && roll_number !== null ? roll_number.toString().trim() : roll_number;
        if (!roll_number || !name) return res.status(400).json({ ok: false, error: 'missing_fields' });

        // Accept either `course_code` (string) or `course_codes` (array/string) for multiple enrollments
        const courseCodes = normalizeCourseCodes(course_codes || course_code);

        // Early check: ensure roll_number is unique within each supplied course
        for (const cc of courseCodes.length ? courseCodes : [null]) {
            const existingRoll = await db.query(
                'SELECT id FROM students WHERE roll_number = $1 AND (course_code = $2 OR (course_code IS NULL AND $2 IS NULL))',
                [roll_number, cc !== undefined && cc !== null ? cc : null]
            );
            if (existingRoll && existingRoll.rows && existingRoll.rows.length > 0) {
                return res.status(409).json({ ok: false, error: 'roll_exists' });
            }
        }

        // If teacher, ensure they are assigned to the course (best-effort: match teacher_name to username)
        if (req.user.role === 'teacher' && course_code) {
            const courseRes = await db.query('SELECT teacher_name FROM courses WHERE course_code = $1', [course_code]);
            if (!courseRes || courseRes.rows.length === 0) {
                return res.status(400).json({ ok: false, error: 'course_not_found' });
            }
            const teacherName = courseRes.rows[0].teacher_name;
            if (teacherName && teacherName !== req.user.username) {
                return res.status(403).json({ ok: false, error: 'not_assigned_to_course' });
            }
        }

        // Create user account for student.
        // Username format: <course_code>/<course_letters>/<roll_number>
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Build username as <course_number>/<course_letters>/<roll_number>
            // e.g. course_code 'JAI-001' -> username '001/JAI/1'
            let courseNumber = '';
            let courseLetters = '';
            if (course_code) {
                const code = course_code.toString();
                // Try to split on dash or underscore
                const parts = code.split(/[-_\/]/).map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    // typical format LETTERS-NUM
                    courseLetters = parts[0].replace(/[^A-Za-z]/g, '').toUpperCase().substring(0,6);
                    courseNumber = parts[1].replace(/[^0-9]/g, '').padStart(3, '0');
                } else {
                    // fallback: extract trailing number and leading letters
                    const m = code.match(/^([A-Za-z]+)\D*(\d+)$/);
                    if (m) {
                        courseLetters = m[1].toUpperCase().substring(0,6);
                        courseNumber = m[2].padStart(3, '0');
                    } else {
                        // as last resort, use sanitized code for letters and '00' for number
                        courseLetters = code.replace(/[^A-Za-z]/g, '').toUpperCase().substring(0,6) || 'UNK';
                        courseNumber = (code.replace(/[^0-9]/g, '').substring(0,3) || '0').padStart(3, '0');
                    }
                }
            }

            if (!courseNumber) courseNumber = '000';
            if (!courseLetters) courseLetters = 'UNK';

            const usernameBuilt = `${courseNumber}/${courseLetters}/${roll_number}`;
            console.log('Creating student, usernameBuilt:', usernameBuilt, 'courseNumber:', courseNumber, 'courseLetters:', courseLetters, 'roll_number:', roll_number);

            const existing = await client.query('SELECT id FROM users WHERE username = $1', [usernameBuilt]);
            if (existing.rows && existing.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ ok: false, error: 'user_exists' });
            }

            const defaultPassword = password || roll_number || 'changeme';
            const hash = await bcrypt.hash(defaultPassword, 10);
            const userInsert = await client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [usernameBuilt, hash, 'student']);
            const userId = userInsert.rows[0].id;

            // Insert student row (keep legacy `course_code` as first course for compatibility)
            const primaryCourse = courseCodes.length ? courseCodes[0] : (course_code || null);
            const studentInsert = await client.query('INSERT INTO students (user_id, roll_number, name, course_code) VALUES ($1, $2, $3, $4) RETURNING id', [userId, roll_number, name, primaryCourse || null]);
            const studentId = studentInsert.rows[0].id;

            // Insert into join table for each course_code (if any)
            for (const cc of courseCodes) {
                await client.query('INSERT INTO student_courses (student_id, course_code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [studentId, cc]);
            }

            await client.query('COMMIT');
            res.json({ ok: true, userId, username: usernameBuilt });
        } catch (txErr) {
            try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
            console.error('Create student transaction error:', txErr);
            // If unique constraint violation, try to map to a helpful error
            if (txErr && txErr.code === '23505') {
                const detail = (txErr.detail || '').toString();
                const constraint = (txErr.constraint || '').toString();
                if (detail.includes('username') || constraint.includes('users_username')) {
                    return res.status(409).json({ ok: false, error: 'user_exists' });
                }
                if (detail.includes('roll_number') || constraint.includes('students_roll_number') || constraint.includes('students_roll_number_course_code_key')) {
                    return res.status(409).json({ ok: false, error: 'roll_exists' });
                }
                // Fallback to generic duplicate error
                return res.status(409).json({ ok: false, error: 'duplicate_key' });
            }
            res.status(500).json({ ok: false, error: 'internal_error' });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Create student error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Admin: delete a student by student id
// DELETE /students/:id
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const studentId = req.params.id;
        const sres = await db.query('SELECT user_id FROM students WHERE id = $1', [studentId]);
        if (!sres || !sres.rows || sres.rows.length === 0) return res.status(404).json({ ok: false, error: 'student_not_found' });
        const userId = sres.rows[0].user_id;

        // Delete the user; students row will be removed via cascade
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete student error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Update a student (teacher/admin)
// PUT /students/:id
router.put('/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const studentId = req.params.id;
        const { roll_number: newRoll, name: newName, course_code: newCourseCode, course_codes: newCourseCodes, password } = req.body;

        // Fetch existing student and user
        const sres = await db.query('SELECT id, user_id, roll_number, name, course_code FROM students WHERE id = $1', [studentId]);
        if (!sres || !sres.rows || sres.rows.length === 0) return res.status(404).json({ ok: false, error: 'student_not_found' });
        const student = sres.rows[0];

        // Normalize new roll if provided
        const rollNorm = newRoll !== undefined && newRoll !== null ? newRoll.toString().trim() : student.roll_number;
        const courseCodesNorm = normalizeCourseCodes(newCourseCodes || newCourseCode || student.course_code);

        // If roll or course(s) changed, ensure uniqueness within each course
        const coursesToCheck = courseCodesNorm.length ? courseCodesNorm : [null];
        for (const cc of coursesToCheck) {
            const existing = await db.query(
                'SELECT id FROM students WHERE roll_number = $1 AND (course_code = $2 OR (course_code IS NULL AND $2 IS NULL)) AND id <> $3',
                [rollNorm, cc !== undefined && cc !== null ? cc : null, studentId]
            );
            if (existing && existing.rows && existing.rows.length > 0) {
                return res.status(409).json({ ok: false, error: 'roll_exists' });
            }
        }

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // If password provided, update user's password
            if (password) {
                const hash = await bcrypt.hash(password, 10);
                await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, student.user_id]);
            }

            // If roll or primary course changed, recompute username and update users.username if needed
            if (rollNorm !== student.roll_number || String((courseCodesNorm[0] || '')) !== String((student.course_code || ''))) {
                // Build username exactly like create logic
                let courseNumber = '';
                let courseLetters = '';
                if (courseCodeNorm) {
                    const code = courseCodeNorm.toString();
                    const parts = code.split(/[-_\//]/).map(p => p.trim()).filter(Boolean);
                    if (parts.length >= 2) {
                        courseLetters = parts[0].replace(/[^A-Za-z]/g, '').toUpperCase().substring(0,6);
                        courseNumber = parts[1].replace(/[^0-9]/g, '').padStart(3, '0');
                    } else {
                        const m = code.match(/^([A-Za-z]+)\D*(\d+)$/);
                        if (m) {
                            courseLetters = m[1].toUpperCase().substring(0,6);
                            courseNumber = m[2].padStart(3, '0');
                        } else {
                            courseLetters = code.replace(/[^A-Za-z]/g, '').toUpperCase().substring(0,6) || 'UNK';
                            courseNumber = (code.replace(/[^0-9]/g, '').substring(0,3) || '0').padStart(3, '0');
                        }
                    }
                }
                if (!courseNumber) courseNumber = '000';
                if (!courseLetters) courseLetters = 'UNK';
                const newUsername = `${courseNumber}/${courseLetters}/${rollNorm}`;

                const existsUser = await client.query('SELECT id FROM users WHERE username = $1 AND id <> $2', [newUsername, student.user_id]);
                if (existsUser && existsUser.rows && existsUser.rows.length > 0) {
                    await client.query('ROLLBACK');
                    return res.status(409).json({ ok: false, error: 'user_exists' });
                }

                await client.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, student.user_id]);
            }

            // Update student_courses join table: replace existing entries with new ones
            if (Array.isArray(courseCodesNorm)) {
                await client.query('DELETE FROM student_courses WHERE student_id = $1', [studentId]);
                for (const cc of courseCodesNorm) {
                    await client.query('INSERT INTO student_courses (student_id, course_code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [studentId, cc]);
                }
            }

            // Update students row (keep legacy single course_code as first mapped course for compatibility)
            const primaryCourse = courseCodesNorm.length ? courseCodesNorm[0] : (newCourseCode !== undefined ? newCourseCode : student.course_code);
            await client.query('UPDATE students SET roll_number = $1, name = $2, course_code = $3 WHERE id = $4', [rollNorm, newName !== undefined ? newName : student.name, primaryCourse !== undefined ? primaryCourse : student.course_code, studentId]);

            await client.query('COMMIT');
            res.json({ ok: true });
        } catch (txErr) {
            try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
            console.error('Update student transaction error:', txErr);
            if (txErr && txErr.code === '23505') return res.status(409).json({ ok: false, error: 'duplicate_key' });
            res.status(500).json({ ok: false, error: 'internal_error' });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Update student error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;

