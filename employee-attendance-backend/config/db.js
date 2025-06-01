// cmrl-backend/config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 seconds
};

console.log('[DB Config] Using database configuration:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port
});


const pool = mysql.createPool(dbConfig);

// Optional: Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Successfully connected to MySQL database pool. DB: ${dbConfig.database}`);
    connection.release();
  } catch (err) {
    console.error('❌ Database pool connection failed on startup:', err.message);
    // Consider exiting the process if DB connection is critical for startup
    // process.exit(1); 
  }
})();

module.exports = pool;