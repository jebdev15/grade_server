// const mysql = require("mysql2/promise");
// require('dotenv').config();
// const startConnection = async () => {
//     try {
//       const conn = await mysql.createPool({
//         host: JSON.parse(process.env.DB_HOST)[0],
//         database: JSON.parse(process.env.DB_NAME)[0],
//         user: JSON.parse(process.env.DB_USER)[0],
//         password: JSON.parse(process.env.DB_PASSWORD)[0],
//       });
//       // console.log("Database Connected.");
//       return conn;
//     } catch (error) {
//       console.error(`ERRDB. - ${error.message}`);
//     }
// };

// const endConnection = async (conn) => {
//     await conn.end();
//     console.log('Connection Closed.');
// };

// const testConnection = async () => {
//     const conn = await startConnection();
//     try {
//         const [rows] = await conn.query(`
//             SELECT 
//             * 
//             FROM 
//             student_grades
//             WHERE credit > 0 
//             AND grade > 0 
//             AND school_year = 2023 
//             AND semester='2nd' 
//             AND remarks = ''
//             `);
//         await fetchRows(rows);
//     } catch (error) {
//         console.error(`ERRDB... - ${error.message}`);
//     } finally {
//         await endConnection(conn);
//     }
// };
// const fetchRows = async (rows) => {
//     rows.map(({student_grades_id}) => {
//         console.log(student_grades_id);
//         updateRemark(student_grades_id);
//     })
// }
// const updateRemark = async (id) => {
//     const conn = await startConnection();
//     try {
//         const [rows] = await conn.query(`
//             UPDATE student_grades
//             SET remarks = 'passed'
//             WHERE student_grades_id = ?
//             `,[id]);
//         console.log(rows.changedRows)
//     } catch (error) {
//         console.error(`ERRDB... - ${error.message}`);
//     } finally {
//         await endConnection(conn);
//     }
// }
// testConnection();