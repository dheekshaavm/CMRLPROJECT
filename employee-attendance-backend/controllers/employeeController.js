// cmrl-backend/controllers/employeeController.js
const dbPool = require('../config/db');

exports.getAllEmployees = async (req, res, next) => {
  try {
    const [results] = await dbPool.query('SELECT id, employee_id, name, email, department, role, date_of_joining, created_at FROM employees');
    res.json(results);
  } catch (err) {
    err.message = `Get all employees error: ${err.message}`;
    next(err);
  }
};

exports.addEmployee = async (req, res, next) => {
  console.log('[employeeController.addEmployee] Received request body:', JSON.stringify(req.body, null, 2));
  let { employeeId, name, email, department, role, dateOfJoining } = req.body;

  if (!employeeId || typeof employeeId !== 'string' || employeeId.trim() === '' || 
      !name || typeof name !== 'string' || name.trim() === '' ||
      !email || typeof email !== 'string' || email.trim() === '' ||
      !department || typeof department !== 'string' || department.trim() === '' ||
      !role || typeof role !== 'string' || role.trim() === '' ||
      !dateOfJoining ) {
    return res.status(400).json({ error: 'All fields are required and must be non-empty strings.' });
  }
  if (!/\S+@\S+\.\S+/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  if (dateOfJoining === "0000-00-00" || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfJoining)) {
      // If your DB column for date_of_joining is NOT NULL, then "0000-00-00" is invalid.
      // If it IS NULLABLE, and you want to allow empty/invalid to become NULL:
      // dateOfJoining = null; 
      // However, for now, let's enforce a valid date string format.
      return res.status(400).json({ error: 'Date of Joining must be a valid date in YYYY-MM-DD format.' });
  }

  try {
    const queryText = 'INSERT INTO employees (employee_id, name, email, department, role, date_of_joining) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [employeeId.trim(), name.trim(), email.trim(), department.trim(), role.trim(), dateOfJoining];
    
    const [result] = await dbPool.query(queryText, values);

    res.status(201).json({
      message: 'Employee added successfully',
      id: result.insertId,
      employeeId: employeeId.trim(),
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      role: role.trim(),
      dateOfJoining
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Employee with this ID or Email already exists.' });
    }
    err.message = `Add employee error: ${err.message}`;
    next(err);
  }
};

exports.getEmployeeById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [results] = await dbPool.query('SELECT id, employee_id, name, email, department, role, date_of_joining, created_at FROM employees WHERE id = ?', [id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Employee not found by PK.' });
    }
    res.json(results[0]);
  } catch (err) {
    err.message = `Get employee by PK ID error: ${err.message}`;
    next(err);
  }
};

exports.getEmployeeByStringId = async (req, res, next) => {
  const { employeeIdString } = req.params;
  if (!employeeIdString) {
    return res.status(400).json({ error: 'Employee ID string is required.' });
  }
  try {
    const query = 'SELECT id, employee_id AS employeeId, name, email, department, role, date_of_joining AS dateOfJoining FROM employees WHERE employee_id = ?';
    const [results] = await dbPool.query(query, [employeeIdString]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Employee not found with the provided string ID.' });
    }
    res.json(results[0]);
  } catch (err) {
    err.message = `Get employee by string ID error: ${err.message}`;
    next(err);
  }
};

exports.updateEmployee = async (req, res, next) => {
  const { id } = req.params;
  const { employeeId, name, email, department, role, dateOfJoining } = req.body;

  if (!employeeId && !name && !email && !department && !role && !dateOfJoining) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  if (dateOfJoining && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfJoining) && dateOfJoining !== "0000-00-00") {
    // Allow "0000-00-00" only if you are converting it to NULL later or your DB allows it
    // For now, if provided, it must be valid format.
     return res.status(400).json({ error: 'Date of Joining must be a valid date in YYYY-MM-DD format if provided for update.' });
  }

  try {
    let querySetters = [];
    const queryParams = [];

    if (employeeId !== undefined) { querySetters.push('employee_id = ?'); queryParams.push(employeeId.trim()); }
    if (name !== undefined) { querySetters.push('name = ?'); queryParams.push(name.trim()); }
    if (email !== undefined) { querySetters.push('email = ?'); queryParams.push(email.trim()); }
    if (department !== undefined) { querySetters.push('department = ?'); queryParams.push(department.trim()); }
    if (role !== undefined) { querySetters.push('role = ?'); queryParams.push(role.trim()); }
    
    let tempDateOfJoining = dateOfJoining;
    if (dateOfJoining === "0000-00-00") tempDateOfJoining = null; // Example: Convert to null if DB allows
    if (tempDateOfJoining !== undefined) { querySetters.push('date_of_joining = ?'); queryParams.push(tempDateOfJoining); }


    if (querySetters.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    let queryText = 'UPDATE employees SET ' + querySetters.join(', ') + ' WHERE id = ?';
    queryParams.push(id);

    const [result] = await dbPool.query(queryText, queryParams);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found or no changes made.' });
    }
    const [updatedEmployee] = await dbPool.query('SELECT id, employee_id, name, email, department, role, date_of_joining FROM employees WHERE id = ?', [id]);
    res.json({ message: 'Employee updated successfully', employee: updatedEmployee[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Update failed due to duplicate entry.' });
    }
    err.message = `Update employee error: ${err.message}`;
    next(err);
  }
};

exports.deleteEmployee = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [result] = await dbPool.query('DELETE FROM employees WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    err.message = `Delete employee error: ${err.message}`;
    next(err);
  }
};