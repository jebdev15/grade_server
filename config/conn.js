const mysql = require("mysql2/promise");
require('dotenv').config();


const startConnection = async (req) => {
  const FRONT_URLS = JSON.parse(process.env.FRONT_URLS);
  const DB_CONFIGS = JSON.parse(process.env.DB_CONFIGS);
  
  const referer = req.headers.referer || req.headers.referrer;
  const refererURL = new URL(referer);
  const index = FRONT_URLS.indexOf(refererURL.origin)
  const refererOrigin = refererURL.origin;
  const dbConfig = index >= 0 ? DB_CONFIGS[index] : DB_CONFIGS[0];
  
  if (index >= 0) {
    console.log(`Referer: ${refererOrigin}`);
    console.log(`Using DB Config index: ${index}`);
    console.log(`DB Config: ${JSON.stringify(dbConfig)}`);
  } else {
    console.log('Referer not allowed. Using default DB config.');
  }

  try {
    const conn = await mysql.createPool({
      host: dbConfig.host,
      database: dbConfig.name,
      user: dbConfig.user,
      password: dbConfig.pass,
    });
    console.log("Database Connected.");
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