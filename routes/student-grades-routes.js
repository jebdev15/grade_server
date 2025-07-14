const express = require("express");
const router = express.Router();
const controller = require("../controllers/student-grades-controller");
const multer = require("multer");
const upload = multer({ dest: "./tmp/" });

// Undergraduate Studies routes
router.get("/grades/:class_code/:academic_level", controller.getStudentsWithGradesByClassCode); // Get students with grades by class code
router.put("/grades/:academic_level", controller.updateStudentGrades); // Update student grade
router.post("/grades/upload-grade-sheet", upload.single("uploadFile"), controller.uploadGradeSheet); // Upload grade sheet
// router.get("/grades/:academic_level/:class_code", controller.getGraduateStudiesStudentsWithGradesByClassCode); // Get graduate studies students with grades by class code

// Graduate Studies routes
// router.put("/graduate-studies/upload-grade-sheet", controller.uploadGraduateStudiesGradeSheet); // Upload graduate studies grade sheet

module.exports = router;
