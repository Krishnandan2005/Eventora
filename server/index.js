import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import bookingRoutes from './routes/bookings.js';

dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const app = express();

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an Origin header
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.error(`CORS blocked: ${origin}`);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);
// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(express.json());

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Eventora API is running',
    });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// ─────────────────────────────────────────────
// MongoDB Connection
// ─────────────────────────────────────────────

let cachedConnection = global._mongooseConnection;

if (!cachedConnection) {
    cachedConnection = global._mongooseConnection = mongoose
        .connect(process.env.MONGO_URI)
        .then((connection) => {
            console.log('MongoDB Connected Successfully !!!');
            return connection;
        })
        .catch((error) => {
            console.error('MongoDB Connection Error:', error);
            global._mongooseConnection = null;
            throw error;
        });
}

// ─────────────────────────────────────────────
// Local Development
// ─────────────────────────────────────────────

if (process.env.VERCEL !== '1') {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// ─────────────────────────────────────────────
// Export for Vercel
// ─────────────────────────────────────────────

export default app;