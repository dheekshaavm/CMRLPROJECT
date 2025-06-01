// cmrl-backend/routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');

// @route   POST /login
// @desc    Authenticate admin & get token
// @access  Public
// This will be mounted at /api/auth/admin, so full path is /api/auth/admin/login
router.post('/login', adminAuthController.adminLogin);

module.exports = router;