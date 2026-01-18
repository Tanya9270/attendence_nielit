import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

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
        res.json({ ok: true, teachers });
    } catch (err) {
        console.error('List teachers error:', err);
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

// Admin: create a teacher (and optionally a course)
// POST /admin/teachers
router.post('/admin/teachers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { username, password, course_code, course_name } = req.body;
        console.log('Create teacher request by:', req.user && req.user.username, 'role:', req.user && req.user.role);
        console.log('Request body:', req.body);
        if (!username || !password) return res.status(400).json({ ok: false, error: 'missing_fields' });

        // Check if user exists
        const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing && existing.rows && existing.rows.length > 0) {
            return res.status(409).json({ ok: false, error: 'user_exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const insertRes = await db.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
            [username, hash, 'teacher']
        );
        const teacherId = insertRes.rows[0].id;

        // Optionally create or update course
        if (course_code) {
            const courseRes = await db.query('SELECT id FROM courses WHERE course_code = $1', [course_code]);
            if (!courseRes || courseRes.rows.length === 0) {
                await db.query('INSERT INTO courses (course_code, course_name, teacher_name) VALUES ($1, $2, $3)', [course_code, course_name || course_code, username]);
            } else {
                await db.query('UPDATE courses SET teacher_name = $1, course_name = COALESCE($2, course_name) WHERE course_code = $3', [username, course_name, course_code]);
            }
        }

        res.json({ ok: true, teacherId });
    } catch (err) {
        console.error('Create teacher error:', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;
