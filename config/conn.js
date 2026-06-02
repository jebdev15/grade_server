const mysql = require("mysql2/promise");
require("dotenv").config();
const {
  DB_HOST,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  FRONT_URLS,
} = require("../utils/envVariables");

const pools = {}; // Cache pools per DB config

const getPool = (index, dbHost, dbName, dbUser, dbPass) => {
  if (!pools[index]) {
    pools[index] = mysql.createPool({
      host: dbHost,
      database: dbName,
      user: dbUser,
      password: dbPass,
    });
  }
  return pools[index];
};

const startConnection = async (req) => {
  const referer = req.headers.referer || req.headers.referrer;
  const refererURL = new URL(referer);
  const index = FRONT_URLS.indexOf(refererURL.origin);
  const dbHost = DB_HOST[index];
  const dbName = DB_NAME[index];
  const dbUser = DB_USER[index];
  const dbPass = DB_PASSWORD[index];

  if (index >= 0) {
  }
  try {
    const pool = getPool(index, dbHost, dbName, dbUser, dbPass);
    const conn = await pool.getConnection(); // <-- Get a connection from the pool
    return conn;
  } catch (error) {
    throw new Error("Failed to connect to the database.");
  }
};

const endConnection = async (conn) => {
  await conn.release(); // <-- Release the connection back to the pool
};

module.exports = {
  startConnection,
  endConnection,
};
