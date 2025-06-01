// cmrl-backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config(); // To access process.env.JWT_SECRET

const JWT_SECRET = process.env.JWT_SECRET || 'yourDefaultStrongSecretKey123!'; // Fallback, ensure .env is set

module.exports = function(req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied.' });
  }

  try {
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7, authHeader.length); // Correctly extract token
    } else {
      token = authHeader; // Assume token is sent directly if not Bearer
    }

    if (!token) {
        return res.status(401).json({ message: 'Malformed token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded.admin; // Add admin payload from JWT to request object
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token is not valid (malformed).' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired.' });
    }
    res.status(401).json({ message: 'Token is not valid.' });
  }
};