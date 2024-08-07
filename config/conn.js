const mysql = require("mysql2/promise");
require('dotenv').config();


const startConnection = async (req) => {
  const FRONT_URLS = JSON.parse(process.env.FRONT_URLS);
  const DB_HOST = JSON.parse(process.env.DB_HOST);
  const DB_NAME = JSON.parse(process.env.DB_NAME);
  const DB_USER = JSON.parse(process.env.DB_USER);
  const DB_PASSWORD = JSON.parse(process.env.DB_PASSWORD);
  
  const referer = req.headers.referer || req.headers.referrer;
  const refererURL = new URL(referer);
  const index = FRONT_URLS.indexOf(refererURL.origin)
  const refererOrigin = refererURL.origin;
  const dbHost = DB_HOST[index];
  const dbName = DB_NAME[index];
  const dbUser = DB_USER[index];
  const dbPass = DB_PASSWORD[index];
  
  if (index >= 0) {
    console.log(`Referer: ${refererOrigin}`);
    console.log(`Using DB Config index: ${index}`);
  }
  console.log(`DB Name: '${dbName}'`);
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