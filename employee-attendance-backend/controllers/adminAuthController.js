// cmrl-backend/controllers/adminAuthController.js
const dbPool = require('../config/db'); // Correct path
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
require('dotenv').config(); // To access process.env.JWT_SECRET

const JWT_SECRET = process.env.JWT_SECRET || 'yourDefaultStrongSecretKey123!';

exports.adminLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [results] = await dbPool.query('SELECT id, name, email, password_hash FROM admin_users WHERE email = ?', [email]);

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials (user not found).' });
    }

    const adminUser = results[0];
    const isMatch = await bcrypt.compare(password, adminUser.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials (password incorrect).' });
    }

    const payload = {
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) {
          console.error('JWT Signing Error:', err);
          // Pass a more generic error to next() or handle specific response here
          const jwtError = new Error('Server error during token generation.');
          jwtError.statusCode = 500;
          return next(jwtError);
        }
        res.json({
          token,
          admin: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email
          }
        });
      }
    );
  } catch (error) {
    error.message = `Admin login processing error: ${error.message}`;
    next(error); // Pass to global error handler
  }
};