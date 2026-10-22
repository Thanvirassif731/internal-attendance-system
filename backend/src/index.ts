import express, { Request, Response } from 'express';
import cors from 'cors';
import { CORS_ORIGIN, PORT as SERVER_PORT } from './config/env';
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import teamRoutes from './routes/team.routes';
import taskRoutes from './routes/task.routes';
import announcementRoutes from './routes/announcement.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import statsRoutes from './routes/stats.routes';

const app = express();

// Middlewares
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Internal Attendance & Task Management API',
    version: '1.0.0',
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/stats', statsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = SERVER_PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
