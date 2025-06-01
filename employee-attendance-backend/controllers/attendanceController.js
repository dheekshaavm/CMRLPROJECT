// cmrl-backend/controllers/attendanceController.js
const dbPool = require('../config/db');

// ===== Employee Actions (called by EmployeeHomeScreen) =====

exports.checkIn = async (req, res, next) => {
  const { employeeId, userName, department, latitude, longitude, timestamp, late } = req.body;
  console.log('[AttendanceCtrl-CheckIn] Received payload:', { employeeId, userName, department, latitude, longitude, timestamp, late });

  if (employeeId === undefined || userName === undefined || department === undefined ||
      latitude === undefined || longitude === undefined || timestamp === undefined || late === undefined) {
    console.error('[AttendanceCtrl-CheckIn] Validation Error: Missing required fields.');
    return res.status(400).json({ error: 'Missing required fields for check-in. All fields (employeeId, userName, department, latitude, longitude, timestamp, late) are required.' });
  }

  try {
    const [empResults] = await dbPool.query('SELECT id FROM employees WHERE employee_id = ?', [employeeId]);
    if (empResults.length === 0) {
      console.error(`[AttendanceCtrl-CheckIn] Employee not found: ${employeeId}`);
      return res.status(404).json({ error: `Employee with Employee ID ${employeeId} not found.` });
    }
    const employee_pk_id = empResults[0].id;

    const [activeWorkAttendance] = await dbPool.query(
      `SELECT id FROM attendance
       WHERE employee_pk_id = ?
         AND check_out_time IS NULL
         AND (early_checkout_reason IS NULL OR early_checkout_reason != 'SYSTEM_LOGIN')
       ORDER BY check_in_time DESC LIMIT 1`,
      [employee_pk_id]
    );

    if (activeWorkAttendance.length > 0) {
      console.warn(`[AttendanceCtrl-CheckIn] Employee ${employeeId} already actively clocked in.`);
      return res.status(409).json({ error: 'Employee is already actively clocked in for a work shift.' });
    }

    const queryText = `
      INSERT INTO attendance
        (employee_pk_id, employee_string_id, user_name, department,
         check_in_time, check_in_latitude, check_in_longitude, is_late,
         early_checkout_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `;
    const values = [
        employee_pk_id, employeeId, userName, department,
        new Date(timestamp), // Ensure timestamp from client is valid ISO string
        parseFloat(latitude), // Ensure latitude is a number
        parseFloat(longitude), // Ensure longitude is a number
        late ? 1 : 0 // Store boolean as 1 or 0
    ];
    console.log('[AttendanceCtrl-CheckIn] Inserting with values:', values);
    const [result] = await dbPool.query(queryText, values);

    console.log(`[AttendanceCtrl-CheckIn] Employee ${employeeId} checked in for work. Attendance Record ID: ${result.insertId}`);
    res.status(201).json({
        message: 'Checked in successfully',
        id: result.insertId, // This is the attendance record primary key
        employeeId: employeeId,
        timestamp: timestamp // Send back the original timestamp for consistency if needed
    });
  } catch (err) {
    console.error('[AttendanceCtrl-CheckIn] Database/Processing Error:', err);
    err.message = `Check-in database error: ${err.message}`;
    next(err);
  }
};

exports.checkOut = async (req, res, next) => {
  const { employeeId, latitude, longitude, timestamp, earlyCheckoutReason, clockInRefId } = req.body;
  console.log('[AttendanceCtrl-CheckOut] Received payload:', { employeeId, latitude, longitude, timestamp, earlyCheckoutReason, clockInRefId });

  if (employeeId === undefined || clockInRefId === undefined || latitude === undefined || longitude === undefined || timestamp === undefined) {
     console.error('[AttendanceCtrl-CheckOut] Validation Error: Missing required fields.');
     return res.status(400).json({ error: 'Missing required fields for check-out (employeeId, clockInRefId, latitude, longitude, timestamp).' });
  }
  if (isNaN(parseInt(clockInRefId))) {
    console.error('[AttendanceCtrl-CheckOut] Validation Error: clockInRefId is not a valid number.');
    return res.status(400).json({ error: 'Invalid clockInRefId format.' });
  }

  try {
    const [empResults] = await dbPool.query('SELECT id FROM employees WHERE employee_id = ?', [employeeId]);
    if (empResults.length === 0) {
      console.error(`[AttendanceCtrl-CheckOut] Employee not found: ${employeeId}`);
      return res.status(404).json({ error: `Employee with Employee ID ${employeeId} not found.` });
    }
    const employee_pk_id = empResults[0].id;

    const queryText = `
        UPDATE attendance
        SET
            check_out_time = ?,
            check_out_latitude = ?,
            check_out_longitude = ?,
            early_checkout_reason = ?
        WHERE
            id = ? AND
            employee_pk_id = ? AND
            check_out_time IS NULL AND
            (early_checkout_reason IS NULL OR early_checkout_reason != 'SYSTEM_LOGIN')
    `;
    const values = [
        new Date(timestamp), // Ensure timestamp is valid ISO
        parseFloat(latitude), // Ensure latitude is a number
        parseFloat(longitude), // Ensure longitude is a number
        earlyCheckoutReason || null,
        parseInt(clockInRefId), // Ensure clockInRefId is an integer
        employee_pk_id
    ];
    console.log('[AttendanceCtrl-CheckOut] Updating with values:', values);
    const [result] = await dbPool.query(queryText, values);

    if (result.affectedRows === 0) {
      console.warn(`[AttendanceCtrl-CheckOut] No rows updated for employee ${employeeId}, clockInRefId ${clockInRefId}. Checking existing record.`);
      const [checkExisting] = await dbPool.query(
        'SELECT check_out_time, early_checkout_reason FROM attendance WHERE id = ? AND employee_pk_id = ?',
        [parseInt(clockInRefId), employee_pk_id]
      );
      if (checkExisting.length === 0) {
        return res.status(404).json({ error: 'Attendance record not found for this employee and clock-in ID.' });
      }
      if (checkExisting[0].early_checkout_reason === 'SYSTEM_LOGIN') {
        return res.status(400).json({ error: 'Cannot perform work clock-out on a system login event.' });
      }
      if (checkExisting[0].check_out_time !== null) {
        return res.status(409).json({ error: 'This attendance record is already checked out.' });
      }
      return res.status(404).json({ error: 'Active work attendance record not found or no update made (possibly due to mismatch or already processed).' });
    }

    console.log(`[AttendanceCtrl-CheckOut] Employee ${employeeId} checked out for attendance ID: ${clockInRefId}`);
    res.json({
        message: 'Checked out successfully',
        id: parseInt(clockInRefId), // Return as number
        timestamp: timestamp
    });
  } catch (err) {
    console.error('[AttendanceCtrl-CheckOut] Database/Processing Error:', err);
    err.message = `Check-out database error: ${err.message}`;
    next(err);
  }
};

// ... rest of attendanceController.js (getEmployeeStatus, getRecentEmployeeAttendance, getAdminAttendanceReports, getFullEmployeeHistory, getEmployeeAttendance)
// Ensure these functions also correctly select and return latitude/longitude fields where needed.
// For example, in getAdminAttendanceReports:
// SELECT ..., att.check_in_latitude, att.check_in_longitude, att.check_out_latitude, att.check_out_longitude, ...

exports.getEmployeeStatus = async (req, res, next) => {
    const { employeeIdString } = req.params;
    console.log(`[AttendanceCtrl-GetStatus] Requested for employeeIdString: ${employeeIdString}`);

    if (!employeeIdString) {
        return res.status(400).json({ error: 'Employee ID string is required.' });
    }
    try {
        const [empResults] = await dbPool.query('SELECT id FROM employees WHERE employee_id = ?', [employeeIdString]);
        if (empResults.length === 0) {
          return res.json({ type: 'clock_out', message: `Employee ID ${employeeIdString} not found.` });
        }
        const employee_pk_id = empResults[0].id;

        const sql = `
            SELECT
                id,
                check_in_time AS timestamp,
                check_in_latitude AS latitude,    -- Make sure to send this
                check_in_longitude AS longitude,  -- Make sure to send this
                is_late,                          -- Send is_late status
                'clock_in' AS type
            FROM attendance
            WHERE
                employee_pk_id = ? AND
                check_out_time IS NULL AND
                (early_checkout_reason IS NULL OR early_checkout_reason != 'SYSTEM_LOGIN')
            ORDER BY check_in_time DESC
            LIMIT 1
        `;
        const [results] = await dbPool.query(sql, [employee_pk_id]);

        if (results.length > 0) {
            console.log(`[AttendanceCtrl-GetStatus] Status for ${employeeIdString}: Clocked In`, results[0]);
            res.json(results[0]); // This will now include lat, lon, is_late
        } else {
            console.log(`[AttendanceCtrl-GetStatus] Status for ${employeeIdString}: Clocked Out`);
            res.json({ type: 'clock_out' });
        }
    } catch (err) {
        console.error('[AttendanceCtrl-GetStatus] Error:', err);
        err.message = `Get employee status error: ${err.message}`;
        next(err);
    }
};

exports.getRecentEmployeeAttendance = async (req, res, next) => {
    const { employeeIdString } = req.params;
    console.log(`[AttendanceCtrl-GetRecent] Requested for employeeIdString: ${employeeIdString}`);

    if (!employeeIdString) {
        return res.status(400).json({ error: 'Employee ID string is required.' });
    }
    try {
        const [empResults] = await dbPool.query('SELECT id FROM employees WHERE employee_id = ?', [employeeIdString]);
        if (empResults.length === 0) {
          return res.json([]);
        }
        const employee_pk_id = empResults[0].id;

        // Fetch raw records for the last 50 entries for the employee
        const sql = `
            SELECT
                id,
                check_in_time,
                check_out_time,
                is_late,
                early_checkout_reason,
                check_in_latitude,
                check_in_longitude,
                check_out_latitude,
                check_out_longitude
            FROM attendance
            WHERE
                employee_pk_id = ? AND
                (early_checkout_reason IS NULL OR early_checkout_reason != 'SYSTEM_LOGIN')
            ORDER BY check_in_time DESC
            LIMIT 50
        `;
        const [allWorkRecords] = await dbPool.query(sql, [employee_pk_id]);

        // Group by date for the frontend (as per your original logic)
        const dailyRecordsMap = new Map();
        for (const record of allWorkRecords) {
            const checkInDateStr = new Date(record.check_in_time).toDateString();

            if (!dailyRecordsMap.has(checkInDateStr)) {
                // Limit to 5 unique days of records
                if (dailyRecordsMap.size < 5) {
                    dailyRecordsMap.set(checkInDateStr, []);
                } else {
                    // If we already have 5 days, and this record is for a new day, skip it.
                    // If it's for one of the 5 days we are already tracking, it will be added.
                    if (!Array.from(dailyRecordsMap.keys()).includes(checkInDateStr)) break;
                }
            }

            if (dailyRecordsMap.has(checkInDateStr)) {
                 const dayRecords = dailyRecordsMap.get(checkInDateStr);
                 if (record.check_in_time) {
                     dayRecords.push({
                         id: record.id.toString() + '_in', // Ensure unique ID for FlatList items
                         type: 'clock_in',
                         timestamp: record.check_in_time.toISOString(),
                         late: !!record.is_late, // Convert 0/1 to boolean
                         latitude: record.check_in_latitude,
                         longitude: record.check_in_longitude,
                         earlyCheckoutReason: null
                     });
                 }
                 if (record.check_out_time) {
                     dayRecords.push({
                         id: record.id.toString() + '_out', // Ensure unique ID
                         type: 'clock_out',
                         timestamp: record.check_out_time.toISOString(),
                         late: null, // Not applicable for clock_out
                         latitude: record.check_out_latitude,
                         longitude: record.check_out_longitude,
                         earlyCheckoutReason: record.early_checkout_reason
                     });
                 }
            }
        }

        const groupedAndSorted = Array.from(dailyRecordsMap.entries()).map(([date, records]) => ({
            date: new Date(date).toISOString().split('T')[0], // Format as YYYY-MM-DD
            records: records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), // Sort records within each day chronologically
        })).sort((a,b) => new Date(b.date) - new Date(a.date)); // Sort days, most recent first

        console.log(`[AttendanceCtrl-GetRecent] Processed ${groupedAndSorted.length} days of recent activity for ${employeeIdString}.`);
        res.json(groupedAndSorted);

    } catch (err) {
        console.error('[AttendanceCtrl-GetRecent] Error for ' + employeeIdString + ':', err);
        err.message = `Get recent attendance error: ${err.message}`;
        next(err);
    }
};


exports.getAdminAttendanceReports = async (req, res, next) => {
    const { employeeIdString, month, year } = req.query;
    console.log('[AdminReportsCtrl] Received filters:', { employeeIdString, month, year });

    if (month === undefined || year === undefined) {
        return res.status(400).json({ error: 'Month and Year are required query parameters.' });
    }
    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    if (isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11 || isNaN(targetYear)) {
        return res.status(400).json({ error: 'Invalid month or year.' });
    }

    const startDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 1, 0, 0, 0)); // Next month, day 1
    console.log(`[AdminReportsCtrl] Date Range (UTC): ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
        let baseQuery = `
            SELECT
                emp.employee_id AS employeeIdString,
                emp.name AS userName,
                att.id AS attendanceRecordPkId,
                att.check_in_time,
                att.check_out_time,
                att.check_in_latitude,   -- Ensure these are selected
                att.check_in_longitude,
                att.check_out_latitude,
                att.check_out_longitude,
                att.is_late,
                att.early_checkout_reason
            FROM attendance att
            JOIN employees emp ON att.employee_pk_id = emp.id
            WHERE
                att.check_in_time >= ? AND att.check_in_time < ?
                AND (att.early_checkout_reason IS NULL OR att.early_checkout_reason != 'SYSTEM_LOGIN')
        `;
        const queryParams = [startDate, endDate];

        if (employeeIdString && employeeIdString.trim() !== '') {
            baseQuery += ` AND emp.employee_id = ?`;
            queryParams.push(employeeIdString.trim());
        }
        baseQuery += ` ORDER BY emp.employee_id ASC, att.check_in_time ASC`;

        const [rawAttendanceRecords] = await dbPool.query(baseQuery, queryParams);
        console.log('[AdminReportsCtrl] Raw records fetched:', rawAttendanceRecords.length);

        if (rawAttendanceRecords.length === 0) {
            return res.json([]);
        }

        const employeeReportsMap = new Map();
        for (const record of rawAttendanceRecords) {
            if (!employeeReportsMap.has(record.employeeIdString)) {
                employeeReportsMap.set(record.employeeIdString, {
                    employeeId: record.employeeIdString,
                    userName: record.userName,
                    presentDaysCount: 0,
                    lateDaysCount: 0,
                    records: [], // This will store transformed clock-in/out events
                    _processedDatesForPresent: new Set(),
                    _processedDatesForLate: new Set()
                });
            }
            const report = employeeReportsMap.get(record.employeeIdString);
            const checkInDate = new Date(record.check_in_time);
            const checkInDateString = checkInDate.toDateString(); // Use toDateString for unique day identification

            // Count present days (one per unique day with a clock-in)
            if (!report._processedDatesForPresent.has(checkInDateString)) {
                report.presentDaysCount++;
                report._processedDatesForPresent.add(checkInDateString);
            }

            // Count late days (one per unique day with a late clock-in)
            // is_late is per record, so if first clock-in of the day is late, count it.
            if (record.is_late && !report._processedDatesForLate.has(checkInDateString)) {
                 // Check if this is the first record for this day in the report's list to avoid double counting late if multiple clock-ins on a late day
                const firstRecordForDay = !report.records.some(r => new Date(r.timestamp).toDateString() === checkInDateString && r.type ==='clock_in');
                if(firstRecordForDay){ // Or some other logic to define "late day"
                    report.lateDaysCount++;
                    report._processedDatesForLate.add(checkInDateString);
                }
            }

            // Add clock-in event
            report.records.push({
                id: record.attendanceRecordPkId.toString() + "_in", // Unique ID for FlatList
                type: 'clock_in',
                timestamp: record.check_in_time.toISOString(),
                late: !!record.is_late,
                latitude: record.check_in_latitude,
                longitude: record.check_in_longitude,
                earlyCheckoutReason: null
            });
            // Add clock-out event if it exists
            if (record.check_out_time) {
                report.records.push({
                    id: record.attendanceRecordPkId.toString() + "_out", // Unique ID
                    type: 'clock_out',
                    timestamp: record.check_out_time.toISOString(),
                    late: null,
                    latitude: record.check_out_latitude,
                    longitude: record.check_out_longitude,
                    earlyCheckoutReason: record.early_checkout_reason
                });
            }
        }

        const finalReports = Array.from(employeeReportsMap.values()).map(report => {
            delete report._processedDatesForPresent; // Clean up temporary sets
            delete report._processedDatesForLate;
            report.records.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort individual events chronologically
            return report;
        });
        if (finalReports.length > 0 && finalReports[0].records.length > 0) {
            const sampleEmployeeReport = finalReports[0];
            console.log(`[BE_AdminReportsCtrl_DIAG] Sample Employee Report for ${sampleEmployeeReport.employeeId}:`);
            sampleEmployeeReport.records.forEach((eventRecord, index) => {
                if (eventRecord.type === 'clock_in') {
                    console.log(`  Clock-In Event ${index}: Lat=${eventRecord.latitude}, Lon=${eventRecord.longitude}, Late=${eventRecord.late}`);
                }
            });
        }
        // ***** END DIAGNOSTIC LOG *****
        console.log('[BE_AdminReportsCtrl] Processed reports count:', finalReports.length);
        res.json(finalReports);

    } catch (error) {
        console.error('[BE_AdminReportsCtrl] Error generating admin reports:', error);
        error.message = `Admin reports generation error: ${error.message}`;
        next(error);
    }
};


exports.getFullEmployeeHistory = async (req, res, next) => {
    const { employeeIdString } = req.params;
    console.log(`[AttendanceCtrl-GetFullHistory] Requested for employeeIdString: ${employeeIdString}`);

    if (!employeeIdString) {
        return res.status(400).json({ error: 'Employee ID string is required.' });
    }

    try {
        const [empResults] = await dbPool.query('SELECT id FROM employees WHERE employee_id = ?', [employeeIdString]);
        if (empResults.length === 0) {
            console.log(`[AttendanceCtrl-GetFullHistory] Employee not found: ${employeeIdString}`);
            return res.json([]);
        }
        const employee_pk_id = empResults[0].id;

        const sql = `
            SELECT
                id,
                check_in_time,
                check_out_time,
                check_in_latitude,
                check_in_longitude,
                check_out_latitude,
                check_out_longitude,
                is_late,
                early_checkout_reason
            FROM attendance
            WHERE employee_pk_id = ?
            ORDER BY check_in_time DESC`; // Fetch most recent first

        const [allDbRecords] = await dbPool.query(sql, [employee_pk_id]);
        console.log(`[AttendanceCtrl-GetFullHistory] Fetched ${allDbRecords.length} raw DB records for ${employeeIdString}.`);

        const transformedRecords = [];
        for (const dbRecord of allDbRecords) {
            if (dbRecord.early_checkout_reason === 'SYSTEM_LOGIN') {
                if (dbRecord.check_in_time) { // SYSTEM_LOGIN uses check_in_time as event time
                    transformedRecords.push({
                        id: dbRecord.id.toString() + "_login",
                        type: 'login_event',
                        timestamp: dbRecord.check_in_time.toISOString(),
                        late: null,
                        latitude: dbRecord.check_in_latitude,
                        longitude: dbRecord.check_in_longitude,
                        earlyCheckoutReason: 'System Login'
                    });
                }
            } else if (dbRecord.early_checkout_reason === 'SYSTEM_LOGOUT') {
                 if (dbRecord.check_in_time) { // SYSTEM_LOGOUT also uses check_in_time as event time
                    transformedRecords.push({
                        id: dbRecord.id.toString() + "_logout_event", // Differentiate ID
                        type: 'logout_event', // New type for clarity
                        timestamp: dbRecord.check_in_time.toISOString(),
                        late: null,
                        latitude: null, // Not typically captured for logout event
                        longitude: null,
                        earlyCheckoutReason: 'System Logout'
                    });
                }
            }
            else { // Regular work shift
                if (dbRecord.check_in_time) {
                    transformedRecords.push({
                        id: dbRecord.id.toString() + "_in",
                        type: 'clock_in',
                        timestamp: dbRecord.check_in_time.toISOString(),
                        late: !!dbRecord.is_late,
                        latitude: dbRecord.check_in_latitude,
                        longitude: dbRecord.check_in_longitude,
                        earlyCheckoutReason: null
                    });
                }
                if (dbRecord.check_out_time) {
                    transformedRecords.push({
                        id: dbRecord.id.toString() + "_out",
                        type: 'clock_out',
                        timestamp: dbRecord.check_out_time.toISOString(),
                        late: null,
                        latitude: dbRecord.check_out_latitude,
                        longitude: dbRecord.check_out_longitude,
                        earlyCheckoutReason: dbRecord.early_checkout_reason
                    });
                }
            }
        }
        // The frontend expects records sorted most recent first for display.
        // The SQL query already does ORDER BY check_in_time DESC.
        // If transforming creates events that need re-sorting based on their actual event time:
        transformedRecords.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


        console.log(`[AttendanceCtrl-GetFullHistory] Transformed to ${transformedRecords.length} event entries for ${employeeIdString}.`);
        res.json(transformedRecords);

    } catch (error) {
        console.error(`[AttendanceCtrl-GetFullHistory] Error for ${employeeIdString}:`, error);
        error.message = `Error fetching full attendance history: ${error.message}`;
        next(error);
    }
};


exports.getEmployeeAttendance = async (req, res, next) => {
  const { employee_id_pk } = req.params;
  console.log(`[AttendanceCtrl-GetAllForPK] Requested for employee_pk_id: ${employee_id_pk}`);
  if (isNaN(parseInt(employee_id_pk))) {
    return res.status(400).json({ error: 'Employee PK ID must be an integer.'});
  }
  try {
    const [results] = await dbPool.query(
        `SELECT * FROM attendance WHERE employee_pk_id = ? ORDER BY check_in_time DESC`, // Select all columns
        [employee_id_pk]
    );
    res.json(results);
  } catch (err) {
    console.error(`[AttendanceCtrl-GetAllForPK] Error for PK ${employee_id_pk}:`, err);
    err.message = `Error fetching all attendance for employee PK: ${err.message}`;
    next(err);
  }
};