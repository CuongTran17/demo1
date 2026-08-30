require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
  const connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL
    ? { uri: process.env.MYSQL_URL || process.env.DATABASE_URL, multipleStatements: true }
    : {
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'NTHair935@',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'ptit_learning',
        multipleStatements: true,
      };

  console.log('Connecting to MySQL database...');
  let connection;
  try {
    if (typeof connectionConfig === 'object' && connectionConfig.uri) {
      connection = await mysql.createConnection({
        uri: connectionConfig.uri,
        multipleStatements: true,
      });
    } else {
      connection = await mysql.createConnection(connectionConfig);
    }
    console.log('Connected successfully!');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', '..', 'database', '01-create-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    console.log('Reading schema SQL...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema creation...');
    await connection.query(schemaSql);
    console.log('Schema created successfully!');

    console.log('Database initialization completed!');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
