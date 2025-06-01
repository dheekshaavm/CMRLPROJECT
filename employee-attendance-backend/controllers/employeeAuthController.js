// cmrl-backend/controllers/employeeAuthController.js
const dbPool = require('../config/db');
const bcrypt = require('bcryptjs'); // Ensure bcryptjs is installed

exports.employeeLogin = async (req, res, next) => {
    // Frontend will now ONLY send employeeId and (optionally) password
    // Name and Department are NOT expected from the client for login anymore.
    // Latitude and longitude for login event recording are optional.
    const { employeeId, password, latitude, longitude } = req.body;

    console.log(`[EmployeeLoginAttempt_V2] Received: employeeId="${employeeId}", password_provided="${!!password}", lat="${latitude}", lon="${longitude}"`);

    if (!employeeId) {
        console.warn('[EmployeeLoginAttempt_V2] Validation Error: Employee ID is required.');
        return res.status(400).json({ error: 'Employee ID is required.' });
    }

    let employeeFromDB;

    try {
        // Select all necessary fields from the employees table
        const employeesSql = `
            SELECT
                id, employee_id AS "employeeIdFromDB", name, email, department, role,
                date_of_joining AS "dateOfJoining", password_hash, is_password_set
            FROM employees
            WHERE employee_id = ?`;

        const [rows] = await dbPool.query(employeesSql, [employeeId]);

        if (rows.length === 0) {
            console.log(`[EmployeeLoginAttempt_V2] Employee ID "${employeeId}" not found in database.`);
            return res.status(404).json({ error: 'Employee ID not found. Please ensure you are registered.' });
        }
        employeeFromDB = rows[0];
        console.log(`[EmployeeLoginAttempt_V2] Found employee: ${employeeFromDB.name}, is_password_set: ${employeeFromDB.is_password_set}`);

        // Scenario 1: Password NOT SET YET (First time login attempt)
        if (!employeeFromDB.is_password_set) {
            console.log(`[EmployeeLoginAttempt_V2] Employee ${employeeId} - Password not set. Proceeding to password setup.`);
            // No Name/Department validation from client needed here.
            // The act of setting a password for this ID effectively claims/confirms it.

            return res.status(200).json({
                message: 'Password setup required for this Employee ID.',
                employeeProfile: { // Send fetched details for the "Set Password" screen & subsequent HomeScreen
                    employeeId: employeeFromDB.employeeIdFromDB,
                    name: employeeFromDB.name,
                    department: employeeFromDB.department,
                    role: employeeFromDB.role // Also send role
                    // Do not send email or dateOfJoining to SetPassword screen unless needed there
                },
                actionRequired: 'SET_PASSWORD'
            });
        }

        // Scenario 2: Password IS SET - Normal login with password
        console.log(`[EmployeeLoginAttempt_V2] Employee ${employeeId} - Password set. Validating provided password.`);
        if (!password) {
            console.warn(`[EmployeeLoginAttempt_V2] Password not provided for an account where password is set (ID: ${employeeId}).`);
            return res.status(400).json({ error: 'Password is required for login.' });
        }

        const isMatch = await bcrypt.compare(password, employeeFromDB.password_hash);
        if (!isMatch) {
            console.warn(`[EmployeeLoginAttempt_V2] Password mismatch for Employee ID "${employeeId}".`);
            return res.status(401).json({ error: 'Invalid credentials. Employee ID or Password incorrect.' });
        }

        // Successful Password Match - Record login event
        console.log(`[EmployeeLoginAttempt_V2] Password match for Employee ID "${employeeId}". Proceeding to record login event.`);
        const now = new Date();
        const employee_pk_id_for_attendance = employeeFromDB.id;

        const attendanceRecordSql = `
            INSERT INTO attendance
                (employee_pk_id, employee_string_id, user_name, department,
                 check_in_time, check_in_latitude, check_in_longitude,
                 is_late, early_checkout_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SYSTEM_LOGIN')`;
        const attendanceValues = [
            employee_pk_id_for_attendance, employeeFromDB.employeeIdFromDB, employeeFromDB.name, employeeFromDB.department,
            now,
            latitude !== undefined ? latitude : null,
            longitude !== undefined ? longitude : null,
            0 // is_late is false for a system login event
        ];

        await dbPool.query(attendanceRecordSql, attendanceValues);
        console.log(`[EmployeeLoginAttempt_V2] Login event recorded for employee: ${employeeFromDB.employeeIdFromDB}`);

        // Send full profile to frontend to populate EmployeeHomeScreen
        res.json({
            message: 'Employee login successful and event recorded',
            employeeProfile: {
                employeeId: employeeFromDB.employeeIdFromDB,
                name: employeeFromDB.name,
                email: employeeFromDB.email, // Can be used by app if needed
                department: employeeFromDB.department,
                role: employeeFromDB.role,
                dateOfJoining: employeeFromDB.dateOfJoining // Can be used by app if needed
            }
            // No actionRequired means direct login to EmployeeHomeScreen
        });

    } catch (error) {
        console.error('[EmployeeLoginAttempt_V2] Error in employeeLogin controller:', error);
        error.message = `Employee login processing error: ${error.message}`; // Keep original message
        next(error); // Pass to global error handler
    }
};

exports.setEmployeePassword = async (req, res, next) => {
    const { employeeId, newPassword } = req.body;

    console.log(`[SetEmployeePassword_V2] Received request. Body:`, req.body);
    console.log(`[SetEmployeePassword_V2] Attempt for employeeId: "${employeeId}", newPassword provided: ${!!newPassword}`);

    if (!employeeId || !newPassword) {
        console.error('[SetEmployeePassword_V2] Validation Error: Missing employeeId or newPassword.');
        return res.status(400).json({ error: 'Employee ID and new password are required.' });
    }
    if (newPassword.length < 6) {
        console.error(`[SetEmployeePassword_V2] Validation Error: Password too short for employeeId "${employeeId}". Length: ${newPassword.length}`);
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        console.log(`[SetEmployeePassword_V2] Looking up employee: ${employeeId}`);
        const [rows] = await dbPool.query('SELECT id, is_password_set FROM employees WHERE employee_id = ?', [employeeId]);

        if (rows.length === 0) {
            console.error(`[SetEmployeePassword_V2] Employee not found: ${employeeId}`);
            return res.status(404).json({ error: 'Employee not found.' });
        }
        const employee = rows[0];
        console.log(`[SetEmployeePassword_V2] Found employee. ID: ${employee.id}, is_password_set: ${employee.is_password_set}`);

        if (employee.is_password_set) {
            console.warn(`[SetEmployeePassword_V2] Password already set for employee: ${employeeId}`);
            return res.status(400).json({ error: 'Password has already been set for this employee.' });
        }

        console.log(`[SetEmployeePassword_V2] Generating salt and hashing password for: ${employeeId}`);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        console.log(`[SetEmployeePassword_V2] Password hashed. Updating database for: ${employeeId}`);

        const updateSql = 'UPDATE employees SET password_hash = ?, is_password_set = TRUE WHERE employee_id = ?';
        const [updateResult] = await dbPool.query(updateSql, [passwordHash, employeeId]);

        if (updateResult.affectedRows > 0) {
            console.log(`[SetEmployeePassword_V2] Password set and updated successfully in DB for employeeId: ${employeeId}`);
            res.status(200).json({ message: 'Password set successfully. You can now log in with your new password.' });
        } else {
            console.error(`[SetEmployeePassword_V2] DB update failed (0 rows affected) for employeeId: ${employeeId}. This is unexpected.`);
            res.status(500).json({ error: 'Failed to update password in the database.' });
        }

    } catch (error) {
        console.error(`[SetEmployeePassword_V2] Error processing request for ${employeeId}:`, error);
        error.message = `Error setting employee password: ${error.message}`;
        next(error);
    }
};

exports.employeeLogout = async (req, res, next) => {
    const { employeeId } = req.body;

    if (!employeeId) {
        console.warn('[EmpAuthCtrl-Logout_V2] Logout attempt without employeeId in body.');
        return res.status(200).json({ message: 'Logout processed (client-side). No server-side record due to missing employeeId.' });
    }
    console.log(`[EmpAuthCtrl-Logout_V2] Received logout request for employeeId: ${employeeId}`);
    try {
        const [empResults] = await dbPool.query('SELECT id, name, department FROM employees WHERE employee_id = ?', [employeeId]);
        if (empResults.length === 0) {
            console.warn(`[EmpAuthCtrl-Logout_V2] Employee ID "${employeeId}" not found for logging logout event.`);
            return res.status(200).json({ message: `Logout processed (client-side). Server log skipped: Employee ${employeeId} not found.` });
        }
        const employee_pk_id = empResults[0].id;
        const employeeName = empResults[0].name;
        const employeeDepartment = empResults[0].department;
        const now = new Date();
        const attendanceRecordSql = `
            INSERT INTO attendance
                (employee_pk_id, employee_string_id, user_name, department,
                 check_in_time, early_checkout_reason)
            VALUES (?, ?, ?, ?, ?, 'SYSTEM_LOGOUT')`;
        const values = [employee_pk_id, employeeId, employeeName, employeeDepartment, now];
        await dbPool.query(attendanceRecordSql, values);
        console.log(`[EmpAuthCtrl-Logout_V2] SYSTEM_LOGOUT event recorded for employee: ${employeeId}`);
        res.json({ message: 'Employee logout event recorded successfully by server.' });
    } catch (error) {
        console.error('[EmpAuthCtrl-Logout_V2] Error recording logout event:', error);
        error.message = `Server error while recording logout event: ${error.message}`;
        next(error);
    }
};