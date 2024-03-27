const mysql = require("mysql2/promise");
const startConnection = async () => {
  try {
    const conn = await mysql.createPool({
      host: "127.0.0.1",
      database: "sisdatabase2",
      user: "root",
      password: "",
    });
    console.log(" Database Connected.");
    return conn;
  } catch (error) {
    console.error(`ERRDB. - ${error.message}`);
  }
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
