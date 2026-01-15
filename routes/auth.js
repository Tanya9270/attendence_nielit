import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

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

// Get server time (for client sync)
router.get('/server-time', (req, res) => {
    const now = new Date();
    res.json({
        server_time: now.toISOString(),
        server_time_ms: now.getTime()
    });
});

export default router;
