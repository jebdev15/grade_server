const StudentService = require("../services/student-grades-service");

const getStudentsWithGradesByClassCode = async (req, res) => {
  const classCode = req.params.class_code;

  try {
    const rows = await StudentService.getStudentsWithGradesByClassCode(req, classCode);
    res.status(200).json({ rows, error: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ rows: [], error: err.message });
  }
};

module.exports = {
  getStudentsWithGradesByClassCode,
};
