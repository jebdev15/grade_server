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
  const dbHost = index >= 0 ? DB_HOST[index] : DB_HOST[0];
  const dbName = index >= 0 ? DB_NAME[index] : DB_NAME[0];
  const dbUser = index >= 0 ? DB_USER[index] : DB_USER[0];
  const dbPass = index >= 0 ? DB_PASSWORD[index] : DB_PASSWORD[0];
  
  if (index >= 0) {
    console.log(`Referer: ${refererOrigin}`);
    console.log(`Using DB Config index: ${index}`);
  } else {
    console.log('Referer not allowed. Using default DB config.');
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