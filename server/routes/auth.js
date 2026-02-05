import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/sendEmail.js';

const router = express.Router();

// In-memory storage for password reset tokens (email -> {token, expiresAt})
const resetTokens = new Map();

// Helper: normalize course codes input to array of trimmed strings
function normalizeCourseCodes(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(c => c && c.toString().trim()).filter(Boolean);
    return input.toString().split(/[;,|]+/).map(s => s.trim()).filter(Boolean);
}

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Login attempt: ${username}`);
        console.log(`Request body:`, req.body);
        console.log(`Password received: "${password}"`);
        console.log(`Password type: ${typeof password}, length: ${password?.length}`);

        if (!username || !password) {
            return res.status(400).json({ ok: false, error: 'missing_credentials' });
        }

        // Get user from database
        console.log('Querying database for user...');
        const result = await db.query(
            'SELECT id, username, password_hash, role FROM users WHERE username = $1',
            [username]
        );
        console.log(`Query returned ${result.rows.length} rows`);

        if (result.rows.length === 0) {
            console.log('User not found');
            return res.status(401).json({ ok: false, error: 'invalid_credentials' });
        }

        const user = result.rows[0];
        console.log(`User found: ${user.username}, role: ${user.role}`);

        // Verify password
        console.log('Verifying password...');
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log(`Password valid: ${validPassword}`);
        
        if (!validPassword) {
            console.log('Invalid password');
            return res.status(401).json({ ok: false, error: 'invalid_credentials' });
        }

        // Update last login
        console.log('Updating last login time...');
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        console.log('Last login updated');

        // Generate JWT token
        console.log('Generating JWT token...');
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful, sending response');
        res.json({
            ok: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Admin: list teachers
// GET /admin/teachers
router.get('/admin/teachers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, role, last_login_at FROM users WHERE role = $1 ORDER BY username', ['teacher']);
        const teachers = result.rows;

        // Attach courses for each teacher
        for (const t of teachers) {
            const tc = await db.query('SELECT course_code FROM teacher_courses WHERE user_id = $1', [t.id]);
            t.course_codes = tc.rows.map(r => r.course_code);
        }

        res.json({ ok: true, teachers });
    } catch (err) {
        console.error('List teachers error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Admin: delete a teacher by user id
// DELETE /admin/teachers/:id
router.delete('/admin/teachers/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const teacherId = req.params.id;
        // Ensure the user exists and is a teacher
        const ures = await db.query('SELECT username, role FROM users WHERE id = $1', [teacherId]);
        if (!ures || !ures.rows || ures.rows.length === 0) return res.status(404).json({ ok: false, error: 'user_not_found' });
        const user = ures.rows[0];
        if (user.role !== 'teacher') return res.status(400).json({ ok: false, error: 'not_a_teacher' });

        // Remove teacher assignment from courses (best-effort)
        if (user.username) {
            await db.query('UPDATE courses SET teacher_name = NULL WHERE teacher_name = $1', [user.username]);
        }

        // Delete user (will cascade any dependent rows)
        await db.query('DELETE FROM users WHERE id = $1', [teacherId]);
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete teacher error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Get server time (for client sync)
router.get('/server-time', (req, res) => {
    const now = new Date();
    res.json({
        server_time: now.toISOString(),
        server_time_ms: now.getTime()
    });
});

// Change password endpoint
// POST /users/change-password
router.post('/users/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ ok: false, error: 'missing_passwords' });
        }
        // Get user from DB
        const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (!result || result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }
        const user = result.rows[0];
        // Check old password
        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) {
            return res.status(401).json({ ok: false, error: 'old_password_incorrect' });
        }
        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);
        // Update password in DB
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
        res.json({ ok: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Admin: create a teacher (and optionally one or more courses)
// POST /admin/teachers
router.post('/admin/teachers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { username, password, course_code, course_name, course_codes } = req.body;
        console.log('Create teacher request by:', req.user && req.user.username, 'role:', req.user && req.user.role);
        console.log('Request body:', req.body);
        if (!username || !password) return res.status(400).json({ ok: false, error: 'missing_fields' });

        // Check if user exists
        const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        let teacherId;
        if (existing && existing.rows && existing.rows.length > 0) {
            // User already exists: attach course(s) to existing teacher instead of creating duplicate
            teacherId = existing.rows[0].id;
            console.log('Teacher already exists, will attach courses to user id', teacherId);
        } else {
            const hash = await bcrypt.hash(password, 10);
            const insertRes = await db.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
                [username, hash, 'teacher']
            );
            teacherId = insertRes.rows[0].id;
        }

        // Normalize course codes (accept single or multiple)
        const codes = normalizeCourseCodes(course_codes || course_code);

        // For each course code, create or update the course and map teacher
        for (const cc of codes) {
            const courseRes = await db.query('SELECT id FROM courses WHERE course_code = $1', [cc]);
            if (!courseRes || courseRes.rows.length === 0) {
                await db.query('INSERT INTO courses (course_code, course_name, teacher_name) VALUES ($1, $2, $3)', [cc, course_name || cc, username]);
            } else {
                    await db.query('UPDATE courses SET teacher_name = $1, course_name = COALESCE($2, course_name) WHERE course_code = $3', [username, course_name, cc]);
            }

                // Insert into teacher_courses join table (avoid duplicates)
                await db.query('INSERT INTO teacher_courses (user_id, course_code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [teacherId, cc]);
        }

            res.json({ ok: true, teacherId, attached: true });
    } catch (err) {
        console.error('Create teacher error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Admin: update a user's password by user id
// PUT /admin/users/:id/password
router.put('/admin/users/:id/password', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const { password } = req.body;
        if (!password) return res.status(400).json({ ok: false, error: 'missing_password' });

        // Ensure user exists
        const ures = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (!ures || !ures.rows || ures.rows.length === 0) return res.status(404).json({ ok: false, error: 'user_not_found' });

        const hash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
        res.json({ ok: true });
    } catch (err) {
        console.error('Admin reset password error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Bootstrap password reset (useful when admin cannot login).
// POST /admin/reset-password-bootstrap
// Requires header 'x-bootstrap-key' equal to process.env.BOOTSTRAP_KEY and body { username, password }
router.post('/admin/reset-password-bootstrap', async (req, res) => {
    try {
        const key = req.headers['x-bootstrap-key'] || req.query.key;
        if (!process.env.BOOTSTRAP_KEY || !key || key !== process.env.BOOTSTRAP_KEY) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ ok: false, error: 'missing_fields' });

        const ures = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (!ures || !ures.rows || ures.rows.length === 0) return res.status(404).json({ ok: false, error: 'user_not_found' });
        const userId = ures.rows[0].id;
        const hash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
        res.json({ ok: true, userId });
    } catch (err) {
        console.error('Bootstrap reset error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Admin: normalize a user's username based on their student record
// PUT /admin/users/:id/normalize-username
router.put('/admin/users/:id/normalize-username', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        // Find student row
        const sres = await db.query('SELECT id, roll_number, course_code FROM students WHERE user_id = $1', [userId]);
        if (!sres || !sres.rows || sres.rows.length === 0) return res.status(404).json({ ok: false, error: 'student_not_found' });
        const student = sres.rows[0];

        const course_code = student.course_code || '';
        const roll_number = student.roll_number;

        // Build username exactly like students.create logic
        let courseNumber = '';
        let courseLetters = '';
        if (course_code) {
            const code = course_code.toString();
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
        const newUsername = `${courseNumber}/${courseLetters}/${roll_number}`;

        // Ensure new username doesn't collide with another user
        const exists = await db.query('SELECT id FROM users WHERE username = $1 AND id <> $2', [newUsername, userId]);
        if (exists && exists.rows && exists.rows.length > 0) {
            return res.status(409).json({ ok: false, error: 'username_collision' });
        }

        await db.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId]);
        res.json({ ok: true, username: newUsername });
    } catch (err) {
        console.error('Normalize username error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Forgot Password endpoint
// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ ok: false, error: 'email_required' });
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY || '3600') * 1000);

        resetTokens.set(email, { token, expiresAt });

        // Generate reset link
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        // Send email
        const emailResult = await sendPasswordResetEmail(email, resetLink);

        if (emailResult.ok) {
            res.json({ ok: true, message: 'Password reset email sent' });
        } else {
            res.status(500).json({ ok: false, error: emailResult.error });
        }
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Reset Password endpoint
// POST /reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, password } = req.body;
        if (!email || !token || !password) {
            return res.status(400).json({ ok: false, error: 'missing_fields' });
        }

        // Verify token
        const tokenData = resetTokens.get(email);
        if (!tokenData || tokenData.token !== token) {
            return res.status(401).json({ ok: false, error: 'invalid_token' });
        }

        // Check expiry
        if (tokenData.expiresAt < Date.now()) {
            resetTokens.delete(email);
            return res.status(401).json({ ok: false, error: 'token_expired' });
        }

        // Find user by email
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (!userResult || userResult.rows.length === 0) {
            // If email column doesn't exist or is empty, try to find by admin/teacher inference
            // For now, we require the email to be in the users table
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const userId = userResult.rows[0].id;

        // Update password
        const hash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

        // Delete token after use
        resetTokens.delete(email);

        res.json({ ok: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;

