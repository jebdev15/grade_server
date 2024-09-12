const { urlDecode } = require("url-encode-base64");
const { startConnection, endConnection } = require("../config/conn");
const { getGradeTableService } = require("./admin.services");

const StudentService = {
    getStudentsByClassCode: async (req) => {
        const { class_code } = req.query;
        const decode = {
          classCode: urlDecode(class_code),
        };
        const conn = await startConnection(req);
        try {
          const rows = await getGradeTableService(conn, decode);
          return rows;
        } catch (err) {
          console.log(err.message);
        } finally {
          await endConnection(conn);
        }
    }
}

module.exports = StudentService;