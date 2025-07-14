const service = require("../services/student-grades-service");

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
    res.status(200).json({ message: totalAffectedRows > 0 ? "Successfully updated" : "No data updated", totalAffectedRows });
  } catch (err) {
    console.error("Update grade failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Upload grade sheet
const uploadGradeSheet = async (req, res) => {
  try {
    const result = await service.uploadGradeSheet(req);
    console.log("Successfully uploaded grade sheet:", result);
    res.json({ message: "Successfully uploaded grade sheet:" });
  } catch (err) {
    console.error("Upload Grade Sheet Failed:", err.message);
    res.status(500).json({ message: err.message || "Failed to upload grade sheet" });
  }
};

// Get graduate studies students with grades by class code
const getGraduateStudiesStudentsWithGradesByClassCode = async (req, res) => {
  try {
    const result = await service.getGraduateStudiesStudentsWithGradesByClassCode(req);
    res.status(200).json({ rows: result, error: null });
  } catch (err) {
    res.status(500).json({ rows: [], error: err.message });
  }
};

const updateGraduateStudiesGrades = async (req, res) => {
  try {
    const totalAffectedRows = await service.updateStudentGrades(req);
    res.status(200).json({ message: totalAffectedRows > 0 ? "Successfully updated" : "No data updated", totalAffectedRows });
  } catch (err) {
    console.error("Update grade failed:", err.message);
    res.status(500).json({ error: err.message });
  }
}
module.exports = {
  getStudentsWithGradesByClassCode, // Get undergraduate students with grades by class code
  updateStudentGrades, // Update undergraduate student grade
  uploadGradeSheet, // Upload undergraduate grade sheet
  getGraduateStudiesStudentsWithGradesByClassCode, // Get graduate studies students with grades by class code
  updateGraduateStudiesGrades // Update graduate studies student grade
};
