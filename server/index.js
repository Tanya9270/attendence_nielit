import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import attendanceRoutes from './routes/attendance.js';
import exportRoutes from './routes/export.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

// Middleware
// Allow configuring allowed origins via ALLOWED_ORIGINS (comma-separated)
let allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://nielitattendance.netlify.app').split(',').map(s => s.trim()).filter(Boolean);

// When running in development include common local dev origins (Vite default)
if ((process.env.NODE_ENV || 'development') === 'development') {
    const devOrigins = [
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'https://localhost:5173', 'https://127.0.0.1:5173',
        'http://localhost:3000', 'http://127.0.0.1:3000'
    ];
    devOrigins.forEach(o => { if (!allowedOrigins.includes(o)) allowedOrigins.push(o); });
}
console.log('CORS allowed origins:', allowedOrigins);
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (e.g., curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
// Error handling middleware — optional verbose output when SHOW_ERRORS=true
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const showErrors = (process.env.SHOW_ERRORS || 'false').toLowerCase() === 'true';
    if (showErrors) {
        return res.status(500).json({ ok: false, error: 'internal_server_error', message: err.message, stack: err.stack });
    }
    res.status(500).json({ ok: false, error: 'internal_server_error' });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`\n🚀 QR Attendance System Server`);
    console.log(`─────────────────────────────────────`);
    console.log(`Server running on: http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.DATABASE_URL) {
        console.log(`Database: PostgreSQL (${process.env.DATABASE_URL})`);
    } else {
        console.log(`Database: Not configured!`);
    }
    console.log(`─────────────────────────────────────\n`);
});
