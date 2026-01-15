import express from 'express';
import PDFDocument from 'pdfkit';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to get holidays
const getHolidays2025 = () => {
    return [
        '2025-01-26', '2025-03-14', '2025-04-14', '2025-04-18', '2025-05-01',
        '2025-05-12', '2025-06-07', '2025-08-15', '2025-08-16', '2025-10-02',
        '2025-10-20', '2025-10-21', '2025-11-01', '2025-11-05', '2025-12-25',
    ];
};

// Calculate working days in a month
const calculateMonthWorkingDays = (year, month) => {
    const holidays = getHolidays2025();
    let workingDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
            workingDays++;
        }
    }
    return workingDays;
};

// Get course info for a student or class
async function getCourseInfo(className, section) {
    try {
        let query = 'SELECT * FROM courses WHERE 1=1';
        const params = [];
        
        if (className) {
            query += ' AND class_name = $' + (params.length + 1);
            params.push(className);
        }
        if (section) {
            query += ' AND section_name = $' + (params.length + 1);
            params.push(section);
        }
        
        const result = await db.query(query, params);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.log('Course table may not exist, returning default');
        return null;
    }
}

// Export Daily Attendance as PDF
router.get('/daily/pdf', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { date, class: className, section, course_code } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        // Course code is REQUIRED for export - each teacher sees only their course students
        if (!course_code) {
            return res.status(400).json({ ok: false, error: 'Please select a course to export attendance' });
        }
        
        // Get course info
        const courseResult = await db.query('SELECT * FROM courses WHERE course_code = $1', [course_code]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Course not found' });
        }
        const courseInfo = courseResult.rows[0];

        // Get ONLY students enrolled in this course
        const studentsResult = await db.query(
            'SELECT id, roll_number, name, class, section, course_code FROM students WHERE course_code = $1 ORDER BY roll_number',
            [course_code]
        );
        
        // Get attendance for the date
        const dateObj = new Date(targetDate + 'T00:00:00.000Z');
        const attendanceResult = await db.query(
            'SELECT student_id, status, scan_time FROM attendance WHERE [date] = $1',
            [dateObj]
        );
        
        const attendanceMap = {};
        attendanceResult.rows.forEach(att => {
            attendanceMap[att.student_id] = att;
        });

        // Create PDF
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        
        res.setHeader('Content-Type', 'application/pdf');
        const filename = courseInfo ? `attendance-${courseInfo.course_code}-${targetDate}.pdf` : `attendance-daily-${targetDate}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);

        // ============ HEADER WITH NIELIT BRANDING ============
        doc.fontSize(18).fillColor('#0066B3').font('Helvetica-Bold');
        doc.text('NIELIT', 40, 40, { align: 'center' });
        doc.fontSize(11).fillColor('#555').font('Helvetica');
        doc.text('National Institute of Electronics & Information Technology', { align: 'center' });
        doc.moveDown(0.3);
        
        // Draw header line
        doc.strokeColor('#0066B3').lineWidth(2)
           .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.8);

        // ============ REPORT TITLE ============
        doc.fontSize(16).fillColor('#000').font('Helvetica-Bold');
        doc.text('Daily Attendance Report', { align: 'center' });
        doc.moveDown(0.5);

        // ============ COURSE INFORMATION BOX ============
        const boxTop = doc.y;
        doc.rect(40, boxTop, 515, 80).fillAndStroke('#f8f9fa', '#ddd');
        
        let infoY = boxTop + 12;
        
        // Course Code and Name - PROMINENT at top
        doc.fontSize(14).fillColor('#0066B3').font('Helvetica-Bold');
        doc.text(`Course Code: ${courseInfo.course_code}`, 60, infoY);
        infoY += 22;
        
        doc.fontSize(12).fillColor('#333').font('Helvetica-Bold');
        doc.text(`Course Name: ${courseInfo.course_name}`, 60, infoY);
        infoY += 22;
        
        // Teacher info only (no class)
        doc.fontSize(10).fillColor('#555').font('Helvetica');
        doc.text(`Teacher: ${courseInfo.teacher_name || 'N/A'}`, 60, infoY);
        
        // Date
        doc.font('Helvetica-Bold').fillColor('#0066B3');
        doc.text(`Date: ${new Date(targetDate).toLocaleDateString('en-IN', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        })}`, 300, infoY);
        
        doc.y = boxTop + 90;
        doc.moveDown(0.5);

        // ============ SUMMARY STATS ============
        const students = studentsResult.rows.map(s => ({
            ...s,
            status: attendanceMap[s.id]?.status || 'absent',
            scan_time: attendanceMap[s.id]?.scan_time
        }));
        
        const presentCount = students.filter(s => s.status === 'present').length;
        const absentCount = students.filter(s => s.status === 'absent').length;

        // Stats boxes
        const statsY = doc.y;
        const boxWidth = 100;
        
        // Total box
        doc.rect(140, statsY, boxWidth, 40).fillAndStroke('#e3f2fd', '#0066B3');
        doc.fontSize(16).fillColor('#0066B3').font('Helvetica-Bold');
        doc.text(String(students.length), 140, statsY + 8, { width: boxWidth, align: 'center' });
        doc.fontSize(9).font('Helvetica');
        doc.text('Total Students', 140, statsY + 26, { width: boxWidth, align: 'center' });
        
        // Present box
        doc.rect(255, statsY, boxWidth, 40).fillAndStroke('#e8f5e9', '#8DC63F');
        doc.fontSize(16).fillColor('#8DC63F').font('Helvetica-Bold');
        doc.text(String(presentCount), 255, statsY + 8, { width: boxWidth, align: 'center' });
        doc.fontSize(9).font('Helvetica');
        doc.text('Present', 255, statsY + 26, { width: boxWidth, align: 'center' });
        
        // Absent box
        doc.rect(370, statsY, boxWidth, 40).fillAndStroke('#ffebee', '#E91E8C');
        doc.fontSize(16).fillColor('#E91E8C').font('Helvetica-Bold');
        doc.text(String(absentCount), 370, statsY + 8, { width: boxWidth, align: 'center' });
        doc.fontSize(9).font('Helvetica');
        doc.text('Absent', 370, statsY + 26, { width: boxWidth, align: 'center' });
        
        doc.y = statsY + 55;

        // ============ TABLE ============
        const tableTop = doc.y;
        const col1 = 50, col2 = 90, col3 = 220, col4 = 370, col5 = 470;
        
        // Table header background
        doc.rect(40, tableTop - 5, 515, 25).fill('#0066B3');
        
        doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
        doc.text('S.No', col1, tableTop);
        doc.text('Roll Number', col2, tableTop);
        doc.text('Name', col3, tableTop);
        doc.text('Status', col4, tableTop);
        doc.text('Scan Time', col5, tableTop);

        // Table rows
        let rowY = tableTop + 25;
        doc.font('Helvetica').fontSize(9);
        
        students.forEach((student, index) => {
            if (rowY > 750) {
                doc.addPage();
                rowY = 50;
                // Repeat header on new page
                doc.rect(40, rowY - 5, 515, 25).fill('#0066B3');
                doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
                doc.text('S.No', col1, rowY);
                doc.text('Roll Number', col2, rowY);
                doc.text('Name', col3, rowY);
                doc.text('Status', col4, rowY);
                doc.text('Scan Time', col5, rowY);
                rowY += 25;
                doc.font('Helvetica').fontSize(9);
            }
            
            // Alternate row background
            if (index % 2 === 0) {
                doc.rect(40, rowY - 3, 515, 18).fill('#f8f9fa');
            }
            
            doc.fillColor('#333');
            doc.text(String(index + 1), col1, rowY);
            doc.font('Helvetica-Bold').text(student.roll_number, col2, rowY);
            doc.font('Helvetica').text(student.name, col3, rowY);
            
            // Status with color
            doc.fillColor(student.status === 'present' ? '#2e7d32' : '#c62828');
            doc.font('Helvetica-Bold').text(student.status.toUpperCase(), col4, rowY);
            doc.font('Helvetica').fillColor('#333');
            
            const scanTime = student.scan_time 
                ? new Date(student.scan_time).toLocaleTimeString('en-IN', { 
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
                  })
                : '-';
            doc.text(scanTime, col5, rowY);
            
            rowY += 18;
        });

        // ============ FOOTER ============
        doc.fontSize(8).fillColor('#999').font('Helvetica');
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 40, 780);
        doc.text('QR Attendance System - NIELIT', 450, 780);

        doc.end();
    } catch (error) {
        console.error('Export daily PDF error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Export Daily Attendance as CSV
router.get('/daily/csv', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { date, class: className, section, course_code } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Course code is REQUIRED for export
        if (!course_code) {
            return res.status(400).json({ ok: false, error: 'Please select a course to export attendance' });
        }

        // Get course info
        const courseResult = await db.query('SELECT * FROM courses WHERE course_code = $1', [course_code]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Course not found' });
        }
        const courseInfo = courseResult.rows[0];

        // Get ONLY students enrolled in this course
        const studentsResult = await db.query(
            'SELECT id, roll_number, name, class, section, course_code FROM students WHERE course_code = $1 ORDER BY roll_number',
            [course_code]
        );
        
        const dateObj = new Date(targetDate + 'T00:00:00.000Z');
        const attendanceResult = await db.query(
            'SELECT student_id, status, scan_time FROM attendance WHERE [date] = $1',
            [dateObj]
        );
        
        const attendanceMap = {};
        attendanceResult.rows.forEach(att => {
            attendanceMap[att.student_id] = att;
        });

        // Generate CSV
        let csv = '';
        
        // Header info with prominent Course Code and Course Name
        csv += 'NIELIT - Daily Attendance Report\n';
        csv += `Course Code,${courseInfo.course_code}\n`;
        csv += `Course Name,${courseInfo.course_name}\n`;
        csv += `Teacher,${courseInfo.teacher_name || 'N/A'}\n`;
        csv += `Date,${new Date(targetDate).toLocaleDateString('en-IN')}\n`;
        csv += '\n';
        
        // Table header (no Class/Section columns)
        csv += 'S.No,Roll Number,Name,Status,Scan Time (IST)\n';
        
        studentsResult.rows.forEach((student, index) => {
            const att = attendanceMap[student.id];
            const status = att?.status || 'absent';
            const scanTime = att?.scan_time 
                ? new Date(att.scan_time).toLocaleString('en-IN', { 
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                    timeZone: 'Asia/Kolkata'
                  })
                : '';
            csv += `${index + 1},${student.roll_number},"${student.name}",${status},${scanTime}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        const filename = `attendance-${courseInfo.course_code}-${targetDate}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('Export daily CSV error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Export Monthly Attendance as PDF
router.get('/monthly/pdf', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { month, year, class: className, section, course_code } = req.query;
        const today = new Date();
        const targetMonth = parseInt(month) || (today.getMonth() + 1);
        const targetYear = parseInt(year) || today.getFullYear();
        
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);
        const daysInMonth = endDate.getDate();
        const monthName = startDate.toLocaleString('en-IN', { month: 'long' });

        // Course code is REQUIRED for export
        if (!course_code) {
            return res.status(400).json({ ok: false, error: 'Please select a course to export attendance' });
        }

        // Get course info
        const courseResult = await db.query('SELECT * FROM courses WHERE course_code = $1', [course_code]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Course not found' });
        }
        const courseInfo = courseResult.rows[0];

        // Get ONLY students enrolled in this course
        const studentsResult = await db.query(
            'SELECT id, roll_number, name, class, section, course_code FROM students WHERE course_code = $1 ORDER BY roll_number',
            [course_code]
        );
        
        // Get attendance for the month
        const attendanceResult = await db.query(
            'SELECT student_id, [date], status, scan_time FROM attendance WHERE [date] >= $1 AND [date] <= $2',
            [startDate, endDate]
        );
        
        // Calculate working days from actual sessions (days with attendance records)
        const sessionDates = new Set();
        attendanceResult.rows.forEach(record => {
            const dateStr = new Date(record.date).toISOString().split('T')[0];
            sessionDates.add(dateStr);
        });
        const workingDays = sessionDates.size;

        // Build attendance stats per student with daily breakdown
        const studentAttendance = {};
        attendanceResult.rows.forEach(record => {
            if (!studentAttendance[record.student_id]) {
                studentAttendance[record.student_id] = { present: 0, leave: 0, dailyRecords: {} };
            }
            const day = new Date(record.date).getDate();
            if (record.status === 'present') {
                studentAttendance[record.student_id].present++;
            } else if (record.status === 'leave') {
                studentAttendance[record.student_id].leave++;
            }
            studentAttendance[record.student_id].dailyRecords[day] = {
                status: record.status,
                scan_time: record.scan_time
            };
        });

        // Generate daily info
        const holidays = getHolidays2025();
        const dailyInfo = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(targetYear, targetMonth - 1, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            dailyInfo.push({
                day,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isHoliday: holidays.includes(dateStr),
                hasSession: sessionDates.has(dateStr)
            });
        }

        const students = studentsResult.rows.map(student => {
            const att = studentAttendance[student.id] || { present: 0, leave: 0, dailyRecords: {} };
            const percentage = workingDays > 0 ? ((att.present / workingDays) * 100).toFixed(1) : 0;
            
            // Build daily array
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
                ...student,
                present: att.present,
                absent: workingDays - att.present - att.leave,
                leave: att.leave,
                percentage: parseFloat(percentage),
                daily
            };
        });

        // Create PDF in landscape for daily grid
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${courseInfo.course_code}-${monthName}-${targetYear}.pdf`);
        doc.pipe(res);

        // Header with NIELIT branding
        doc.fontSize(14).fillColor('#0066B3').font('Helvetica-Bold');
        doc.text('NIELIT', { align: 'center' });
        doc.fontSize(9).fillColor('#666').font('Helvetica');
        doc.text('National Institute of Electronics & Information Technology', { align: 'center' });
        doc.moveDown(0.3);
        
        doc.strokeColor('#0066B3').lineWidth(2)
           .moveTo(20, doc.y).lineTo(820, doc.y).stroke();
        doc.moveDown(0.5);

        // Title
        doc.fontSize(14).fillColor('#000').font('Helvetica-Bold');
        doc.text('Monthly Attendance Report', { align: 'center' });
        doc.moveDown(0.3);
        
        // Course info
        doc.fontSize(12).fillColor('#0066B3').font('Helvetica-Bold');
        doc.text(`Course Code: ${courseInfo.course_code}`, { align: 'center' });
        doc.fontSize(10).fillColor('#333').font('Helvetica-Bold');
        doc.text(`${courseInfo.course_name}`, { align: 'center' });
        doc.moveDown(0.2);
        
        doc.fontSize(9).fillColor('#555').font('Helvetica');
        doc.text(`Faculty: ${courseInfo.teacher_name || 'N/A'}`, { align: 'center' });
        doc.text(`Month: ${monthName} ${targetYear}  |  Session Days: ${workingDays}`, { align: 'center' });
        doc.moveDown(0.5);

        // Overall stats
        const totalPresent = students.reduce((sum, s) => sum + s.present, 0);
        const overallPercentage = (students.length > 0 && workingDays > 0)
            ? ((totalPresent / (students.length * workingDays)) * 100).toFixed(1)
            : 0;

        doc.fontSize(9).fillColor('#666');
        doc.text(`Total Students: ${students.length}  |  Overall Attendance: ${overallPercentage}%`, { align: 'center' });
        doc.moveDown(0.5);

        // Daily attendance table
        const tableTop = doc.y;
        const startX = 20;
        const nameColWidth = 70;
        const dayColWidth = 20;
        const summaryColWidth = 25;
        
        // Header row - Days 1-31
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#0066B3');
        doc.text('Student', startX, tableTop, { width: nameColWidth });
        
        for (let day = 1; day <= daysInMonth; day++) {
            const x = startX + nameColWidth + (day - 1) * dayColWidth;
            const dayData = dailyInfo[day - 1];
            if (dayData.isWeekend) {
                doc.fillColor('#c62828');
            } else if (dayData.isHoliday) {
                doc.fillColor('#e65100');
            } else if (dayData.hasSession) {
                doc.fillColor('#2e7d32');
            } else {
                doc.fillColor('#999');
            }
            doc.text(String(day), x, tableTop, { width: dayColWidth, align: 'center' });
        }
        
        // Summary columns
        const summaryX = startX + nameColWidth + daysInMonth * dayColWidth;
        doc.fillColor('#0066B3');
        doc.text('P', summaryX, tableTop, { width: summaryColWidth, align: 'center' });
        doc.text('A', summaryX + summaryColWidth, tableTop, { width: summaryColWidth, align: 'center' });
        doc.text('%', summaryX + summaryColWidth * 2, tableTop, { width: summaryColWidth, align: 'center' });
        
        doc.strokeColor('#0066B3').lineWidth(0.5)
           .moveTo(startX, tableTop + 12).lineTo(summaryX + summaryColWidth * 3, tableTop + 12).stroke();

        // Student rows
        let rowY = tableTop + 18;
        doc.font('Helvetica').fontSize(6);
        
        students.forEach((student) => {
            if (rowY > 550) {
                doc.addPage();
                rowY = 50;
            }
            
            // Student name
            doc.fillColor('#333');
            doc.text(`${student.roll_number}`, startX, rowY, { width: nameColWidth });
            doc.text(`${student.name.substring(0, 15)}`, startX, rowY + 7, { width: nameColWidth });
            
            // Daily attendance
            for (let day = 1; day <= daysInMonth; day++) {
                const x = startX + nameColWidth + (day - 1) * dayColWidth;
                const dayRecord = student.daily[day - 1];
                const dayData = dailyInfo[day - 1];
                
                if (dayRecord.status === 'present') {
                    doc.fillColor('#2e7d32').font('Helvetica-Bold');
                    doc.text('P', x, rowY + 1, { width: dayColWidth, align: 'center' });
                    doc.font('Helvetica');
                    if (dayRecord.scan_time) {
                        doc.fontSize(6).fillColor('#0066B3').font('Helvetica-Bold');
                        const time = new Date(dayRecord.scan_time).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit', minute: '2-digit', hour12: false
                        });
                        doc.text(time || '', x, rowY + 10, { width: dayColWidth, align: 'center' });
                        doc.fontSize(6).font('Helvetica');
                    }
                } else if (dayRecord.status === 'absent') {
                    doc.fillColor('#E91E8C').font('Helvetica-Bold');
                    doc.text('A', x, rowY + 1, { width: dayColWidth, align: 'center' });
                    doc.font('Helvetica');
                } else if (dayRecord.status === 'leave') {
                    doc.fillColor('#ff9800').font('Helvetica-Bold');
                    doc.text('L', x, rowY + 1, { width: dayColWidth, align: 'center' });
                    doc.font('Helvetica');
                } else if (dayData.isWeekend) {
                    doc.fillColor('#999');
                    doc.text('W', x, rowY + 1, { width: dayColWidth, align: 'center' });
                } else if (dayData.isHoliday) {
                    doc.fillColor('#999');
                    doc.text('H', x, rowY + 1, { width: dayColWidth, align: 'center' });
                } else {
                    doc.fillColor('#ccc');
                    doc.text('-', x, rowY + 1, { width: dayColWidth, align: 'center' });
                }
            }
            
            // Summary
            doc.fillColor('#8DC63F').font('Helvetica-Bold');
            doc.text(String(student.present), summaryX, rowY + 3, { width: summaryColWidth, align: 'center' });
            doc.fillColor('#E91E8C');
            doc.text(String(student.absent), summaryX + summaryColWidth, rowY + 3, { width: summaryColWidth, align: 'center' });
            
            const pctColor = student.percentage >= 75 ? '#2e7d32' : student.percentage >= 50 ? '#e65100' : '#c62828';
            doc.fillColor(pctColor);
            doc.text(`${student.percentage}%`, summaryX + summaryColWidth * 2, rowY + 3, { width: summaryColWidth, align: 'center' });
            doc.font('Helvetica');
            
            rowY += 22;
        });

        // Legend
        doc.moveDown(1);
        doc.fontSize(7).fillColor('#666');
        doc.text('Legend: P Present (with scan time) | A Absent | L Leave | W Weekend | H Holiday | - No Session', 20, doc.y);
        doc.text('Note: Session Days = Days when attendance was conducted. Green column headers indicate session days.', 20, doc.y + 10);

        // Footer
        doc.fontSize(7).fillColor('#999');
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 20, 560);
        doc.text('QR Attendance System - NIELIT', 720, 560);

        doc.end();
    } catch (error) {
        console.error('Export monthly PDF error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Export Monthly Attendance as CSV
router.get('/monthly/csv', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { month, year, class: className, section, course_code } = req.query;
        const today = new Date();
        const targetMonth = parseInt(month) || (today.getMonth() + 1);
        const targetYear = parseInt(year) || today.getFullYear();
        
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);
        const monthName = startDate.toLocaleString('en-IN', { month: 'long' });

        // Course code is REQUIRED for export
        if (!course_code) {
            return res.status(400).json({ ok: false, error: 'Please select a course to export attendance' });
        }

        // Get course info
        const courseResult = await db.query('SELECT * FROM courses WHERE course_code = $1', [course_code]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Course not found' });
        }
        const courseInfo = courseResult.rows[0];

        // Get ONLY students enrolled in this course
        const studentsResult = await db.query(
            'SELECT id, roll_number, name, class, section, course_code FROM students WHERE course_code = $1 ORDER BY roll_number',
            [course_code]
        );
        
        // Get attendance for the month
        const attendanceResult = await db.query(
            'SELECT student_id, [date], status FROM attendance WHERE [date] >= $1 AND [date] <= $2',
            [startDate, endDate]
        );
        
        // Calculate working days
        let workingDays = calculateMonthWorkingDays(targetYear, targetMonth);
        if (targetYear === today.getFullYear() && targetMonth === (today.getMonth() + 1)) {
            const holidays = getHolidays2025();
            workingDays = 0;
            for (let day = 1; day <= today.getDate(); day++) {
                const date = new Date(targetYear, targetMonth - 1, day);
                const dayOfWeek = date.getDay();
                const dateStr = date.toISOString().split('T')[0];
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
                    workingDays++;
                }
            }
        }

        // Build attendance stats
        const studentAttendance = {};
        attendanceResult.rows.forEach(record => {
            if (!studentAttendance[record.student_id]) {
                studentAttendance[record.student_id] = { present: 0, leave: 0 };
            }
            if (record.status === 'present') {
                studentAttendance[record.student_id].present++;
            } else if (record.status === 'leave') {
                studentAttendance[record.student_id].leave++;
            }
        });

        // Generate CSV
        let csv = '';
        
        // Header info with prominent Course Code and Course Name (no Class info)
        csv += 'NIELIT - Monthly Attendance Report\n';
        csv += `Course Code,${courseInfo.course_code}\n`;
        csv += `Course Name,${courseInfo.course_name}\n`;
        csv += `Teacher,${courseInfo.teacher_name || 'N/A'}\n`;
        csv += `Month,${monthName} ${targetYear}\n`;
        csv += `Working Days,${workingDays}\n`;
        csv += '\n';
        
        // Table header (no Class/Section columns)
        csv += 'S.No,Roll Number,Name,Present,Absent,Leave,Percentage,Status\n';
        
        studentsResult.rows.forEach((student, index) => {
            const att = studentAttendance[student.id] || { present: 0, leave: 0 };
            const absent = workingDays - att.present - att.leave;
            const percentage = workingDays > 0 ? ((att.present / workingDays) * 100).toFixed(1) : 0;
            const status = percentage >= 75 ? 'Good' : percentage >= 50 ? 'Low' : 'Critical';
            
            csv += `${index + 1},${student.roll_number},"${student.name}",${att.present},${absent},${att.leave},${percentage}%,${status}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        const filename = `attendance-${courseInfo.course_code}-${monthName}-${targetYear}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('Export monthly CSV error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Get all courses
router.get('/courses', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM courses WHERE 1=1';
        const params = [];

        // If user is a teacher (not admin), only show courses they teach
        if (req.user.role === 'teacher') {
            query += ' AND teacher_name = $' + (params.length + 1);
            params.push(req.user.username);
        }

        query += ' ORDER BY course_code';
        const result = await db.query(query, params);
        res.json({ ok: true, courses: result.rows });
    } catch (error) {
        console.error('Get courses error:', error);
        res.json({ ok: true, courses: [] });
    }
});

export default router;
