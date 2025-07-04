const { startConnection, endConnection } = require("../config/conn");
const StudentModel = require("../models/student-grades-model");

const getStudentsWithGradesByClassCode = async (req, classCode) => {
  const conn = await startConnection(req);
  try {
    const rows = await StudentModel.getStudentsWithGradesByClassCode(conn, classCode);
    return rows;
  } finally {
    await endConnection(conn);
  }
};

module.exports = {
  getStudentsWithGradesByClassCode,
};
