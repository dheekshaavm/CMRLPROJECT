// cmrl-backend/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const adminAuthMiddleware = require('../middleware/authMiddleware');
// const employeeAuthMiddleware = require('../middleware/employeeAuthMiddleware'); // TODO: If you implement employee JWTs

// These routes are typically called by the employee app
// Consider adding employeeAuthMiddleware once employee JWTs are implemented
router.post('/clock-in', /* employeeAuthMiddleware, */ attendanceController.checkIn);
router.post('/clock-out', /* employeeAuthMiddleware, */ attendanceController.checkOut);
router.get('/status/:employeeIdString', /* employeeAuthMiddleware, */ attendanceController.getEmployeeStatus);
router.get('/recent/:employeeIdString', /* employeeAuthMiddleware, */ attendanceController.getRecentEmployeeAttendance);

// This new route is for EmployeeFullRecordsScreen to get all history for a specific employee
router.get('/history/:employeeIdString', /* employeeAuthMiddleware, */ attendanceController.getFullEmployeeHistory);


// This route is for Admin reports
router.get('/admin-reports', adminAuthMiddleware, attendanceController.getAdminAttendanceReports);

// This route fetches all attendance records for an employee's INTEGER PK (might be for admin too)
router.get('/history/employee-pk/:employee_id_pk', adminAuthMiddleware, attendanceController.getEmployeeAttendance);

module.exports = router;