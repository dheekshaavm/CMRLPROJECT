// cmrl-backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminAuthRouter = require('./routes/adminAuthRoutes'); // Standardized admin auth
const employeeAuthRoutes = require('./routes/employeeAuthRoutes');

app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/auth/admin', adminAuthRouter);     // For POST /api/auth/admin/login
app.use('/api/auth/employee', employeeAuthRoutes); // For POST /api/auth/employee/login

// Root path
app.get('/', (req, res) => {
  res.send('🎉 Employee Attendance Backend is working!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('----- Global Error Handler -----');
  console.error('Path:', req.path);
  console.error('Message:', err.message);
  if (process.env.NODE_ENV !== 'production') { // Don't log full stack in prod
    console.error('Stack:', err.stack);
  }
  console.error('-----------------------------');
  
  const statusCode = err.statusCode || 500;
  const errorMessage = (process.env.NODE_ENV === 'production' && statusCode === 500)
                       ? 'An unexpected server error occurred.' 
                       : err.message || 'Something broke on the server!';
  
  res.status(statusCode).json({ error: errorMessage });
});

const PORT = parseInt(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});