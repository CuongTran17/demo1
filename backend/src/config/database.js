const mysql = require('mysql2/promise');
require('dotenv').config();

const url = process.env.MYSQL_PRIVATE_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;

const connectionConfig = url
  ? url
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
      console.log('✅ MySQL connected successfully to', typeof connectionConfig === 'string' ? 'remote URI' : connectionConfig.host);
      conn.release();
    })
    .catch((err) => {
      console.error('❌ MySQL connection failed:', err.message, err.code);
    });
}

module.exports = pool;
