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
  
  // connected to syndicateadmin_testsisdb
  // try {
  //   const conn = await mysql.createPool({
  //     host: "92.204.139.146",
  //     database: "syndicateadmin_testsisdb",
  //     user: "syndicateadmin_testsisdb",
  //     password: "KV^K$J7Wu$qY",
  //   });
  //   console.log("Cloud Test Database Connected.");
  //   return conn;
  // } catch (error) {
  //   console.error(`ERRDB. - ${error.message}`);
  // }
  // try {
  //   const conn = await mysql.createPool({
  //     host: "192.168.101.4",
  //     database: "sisdatabase2",
  //     user: "ict",
  //     password: "%%ChM$u@Dm1n**",
  //   });
  //   console.log(" Database Connected.");
  //   return conn;
  // } catch (error) {
  //   console.error(`ERRDB. - ${error.message}`);
  // }
};

const endConnection = async (conn) => {
  await conn.end();
};

module.exports = {
  startConnection,
  endConnection,
};
