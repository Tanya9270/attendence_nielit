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
app.use(cors({
    origin: true, // Allow all origins for development
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
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
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
