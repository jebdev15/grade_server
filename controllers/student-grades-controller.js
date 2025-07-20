const service = require("../services/student-grades-service");

// Faculty functions
// Get student grade by class_code, school_year, and semester
const getStudents = async (req, res) => {
  try {
    const rows = await service.getStudents(req);
    res.status(200).json({ rows, error: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ rows: [], error: err.message });
  }
}

// Update student grade
const updateStudentGrade = async (req, res) => {
  try {
    const result = await service.updateStudentGrade(req);
    res.json(result);
  } catch (err) {
    console.error("Update Student Grades Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Upload grade sheet
const uploadExcel = async (req, res) => {
  try {
    const result = await service.uploadExcel(req);
    res.json({ message: "Successfully uploaded grade sheet", result});
  } catch (err) {
    console.error("Upload Grade Sheet Failed:", err.message);
    res
      .status(500)
      .json({ message: err.message || "Failed to upload grade sheet" });
  }
};

// Administrator functions
// Get the number of students with no credits
const getStudentsWithNoCredits = async (req, res) => {
  try {
    const rows = await service.getStudentsWithNoCredits(req);
    res
      .status(200)
      .json({ rows, message: "Successfully fetched", error: null });
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .json({ rows: [], message: "Failed to fetch", error: err.message });
  }
};

// Get students with grades by class code
const getStudentsWithGradesByClassCode = async (req, res) => {
  try {
    const rows = await service.getStudentsWithGradesByClassCode(req);
    res.status(200).json({ rows, error: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ rows: [], error: err.message });
  }
};

// Update student grades
const updateStudentGrades = async (req, res) => {
  try {
    const totalAffectedRows = await service.updateStudentGrades(req);
    res
      .status(200)
      .json({
        message:
          totalAffectedRows > 0 ? "Successfully updated" : "No data updated",
        totalAffectedRows,
      });
  } catch (err) {
    console.error("Update grade failed:", err);
    res.status(500).json({ error: err.message });
  }
};

// Upload grade sheet
const uploadGradeSheet = async (req, res) => {
  try {
    const result = await service.uploadGradeSheet(req);
    res.json({ message: "Successfully uploaded grade sheet", result });
  } catch (err) {
    console.error("Upload Grade Sheet Failed:", err.message);
    res
      .status(500)
      .json({ message: err.message || "Failed to upload grade sheet" });
  }
};

// Get graduate studies students with grades by class code
module.exports = {
  getStudents, // Get student grade by class_code, school_year, and semester. This function is used by the faculty
  updateStudentGrade, // Update student grade. This function is used by the faculty
  uploadExcel, // Upload grade sheet. This function is used by the faculty
  getStudentsWithNoCredits, // Get students with no credits
  getStudentsWithGradesByClassCode, // Get undergraduate students with grades by class code
  updateStudentGrades, // Update undergraduate student grade
  uploadGradeSheet, // Upload undergraduate grade sheet
};
