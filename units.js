const mysql = require("mysql2/promise");

// const updateStudentCredit = async (student_id, conn) => {
//     const [rows] = await conn.query(`
//         UPDATE student_load sl
//         INNER JOIN student s
//             ON sl.student_id = s.student_id`
// }

const connectToDB = async () => {
    try {
        const conn = await mysql.createPool({
          host: "192.168.101.4",
          database: "sisdatabase2",
          user: "ict",
          password: "%%ChM$u@Dm1n**",
        //   host: "localhost",
        //   database: "test_sisdatabase",
        //   user: "root",
        //   password: "",
        //   host: "92.204.139.146",
        //   database: "syndicateadmin_testgrading",
        //   user: "syndicateadmin_testgrading",
        //   password: "1c7m15_6r4d1n65y573m",
        });
        // console.log("Database Connected.");
        return conn;
      } catch (error) {
        console.error(`ERRDB. - ${error.message}`);
    }
}
const closeConnection = async (conn) => {
    await conn.end();
    console.log('Connection Closed.');
  };
const updateStudentCredit = async () => {  
    const conn = await connectToDB();
    try {
        const [rows] = await conn.query("SELECT * from emails");
        console.log("Database Connected.",rows.length);
    } catch (error) {
        console.error(`ERRDB. - ${error.message}`);
    } finally {
        closeConnection(conn);
    }
}
checkConnection();
