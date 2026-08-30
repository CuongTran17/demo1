const mysql = require('mysql2/promise');
require('dotenv').config();

const connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL
  ? process.env.MYSQL_URL || process.env.DATABASE_URL
  : {
      host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'NTHair935@',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'ptit_learning',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    };

const pool = mysql.createPool(connectionConfig);

// Test connection on startup, but avoid opening a background connection in unit tests.
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection()
    .then((conn) => {
      console.log('MySQL connected successfully');
      conn.release();
    })
    .catch((err) => {
      console.error('MySQL connection failed:', err.message);
    });
}

module.exports = pool;
