const mysql = require("mysql2/promise");
require('dotenv').config();
const {
  DB_HOST,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  FRONT_URLS
} = require('../utils/envVariables');

const startConnection = async (req) => {
  const referer = req.headers.referer || req.headers.referrer;
  const refererURL = new URL(referer);
  const index = FRONT_URLS.indexOf(refererURL.origin)
  const refererOrigin = refererURL.origin;
  const dbHost = DB_HOST[index];
  const dbName = DB_NAME[index];
  const dbUser = DB_USER[index];
  const dbPass = DB_PASSWORD[index];
  
  // if (index >= 0) {
  //   console.log(`Referer: ${refererOrigin}`);
  //   console.log(`Using DB Config index: ${index}`);
  // }
  // console.log(`DB Name: '${dbName}'`);
  try {
    const conn = await mysql.createPool({
      host: dbHost,
      database: dbName,
      user: dbUser,
      password: dbPass,
    });
    // console.log("Database Connected.");
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