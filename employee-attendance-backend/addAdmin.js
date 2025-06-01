// cmrl-backend/addAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const dbPool = require('./config/db'); // Ensure this path is correct

async function addAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin@cmrl.com';
    const plainPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
    const name = process.env.ADMIN_NAME || 'Super Admin';

    if (!email || !plainPassword || !name) {
        console.error('Error: ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME must be set in .env or provided as defaults.');
        return;
    }

    try {
        console.log(`Attempting to add admin: ${name} (${email})`);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);

        const sqlCheck = "SELECT id FROM admin_users WHERE email = ?";
        const [existingAdmins] = await dbPool.query(sqlCheck, [email]);

        if (existingAdmins.length > 0) {
            console.log(`Admin user with email ${email} already exists.`);
            return;
        }

        const sqlInsert = "INSERT INTO admin_users (email, password_hash, name) VALUES (?, ?, ?)";
        const [result] = await dbPool.query(sqlInsert, [email, passwordHash, name]);
        console.log('Admin user added successfully:', { id: result.insertId, email, name });
    } catch (error) {
        console.error('Error adding admin user:', error.message);
    } finally {
        // Only end the pool if this script is truly standalone.
        // If required by other parts of an application startup, don't end it here.
        console.log('Closing database pool (addAdmin script).');
        await dbPool.end(); 
    }
}

// Check if this script is run directly
if (require.main === module) {
    addAdmin();
}

module.exports = addAdmin; // Export if you might call it from elsewhere