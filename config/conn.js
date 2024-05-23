const mysql = require("mysql2/promise");
require('dotenv').config();

const startConnection = async () => {
  // Local sisdatabase2
  try {
    const conn = await mysql.createPool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    console.log("Local Database Connected.");
    return conn;
  } catch (error) {
    console.error(`ERRDB. - ${error.message}`);
  }
};

const endConnection = async (conn) => {
  await conn.end();
  console.log('Connection Closed.');
};

module.exports = {
  startConnection,
  endConnection,
};
