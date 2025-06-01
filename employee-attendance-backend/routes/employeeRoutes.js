// cmrl-backend/routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware'); // Admin auth

// GET / (all employees)
router.get('/', authMiddleware, employeeController.getAllEmployees);

// POST / (add new employee)
router.post('/', authMiddleware, employeeController.addEmployee);

// GET /profile/:employeeIdString (get employee by string ID like "E1001") - For employee login/profile fetch
router.get('/profile/:employeeIdString', employeeController.getEmployeeByStringId); // No auth for now for simplicity

// GET /:id (get employee by integer PK ID)
router.get('/:id', authMiddleware, employeeController.getEmployeeById);

// PUT /:id (update employee by integer PK ID)
router.put('/:id', authMiddleware, employeeController.updateEmployee);

// DELETE /:id (delete employee by integer PK ID)
router.delete('/:id', authMiddleware, employeeController.deleteEmployee);

module.exports = router;