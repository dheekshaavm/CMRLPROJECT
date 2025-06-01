// cmrl-backend/routes/employeeAuthRoutes.js
const express = require('express');
const router = express.Router();
const employeeAuthController = require('../controllers/employeeAuthController');

// @route   POST /login
// @desc    Authenticate employee (handles initial validation and password login) & get profile/action
// @access  Public
router.post('/login', employeeAuthController.employeeLogin);

// @route   POST /set-password
// @desc    Allows an employee to set their password for the first time
// @access  Public (but employeeId must be valid and password not yet set)
router.post('/set-password', employeeAuthController.setEmployeePassword);

// @route   POST /logout
// @desc    Records an employee logout event
// @access  Public (or authenticated if you implement employee tokens later)
router.post('/logout', employeeAuthController.employeeLogout);

module.exports = router;