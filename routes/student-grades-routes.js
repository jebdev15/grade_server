const express = require("express");
const router = express.Router();
const controller = require("../controllers/student-grades-controller");
const multer = require("multer");
const upload = multer({ dest: "./tmp/" });

// Student grades routes
router.get("/credits/:school_year/:semester", controller.getStudentsWithNoCredits); // Get students with no credits
router.get("/grades/:class_code/:academic_level", controller.getStudentsWithGradesByClassCode); // Get students with grades by class code
router.put("/grades/:academic_level", controller.updateStudentGrades); // Update student grade
router.post("/grades/upload-grade-sheet/:academic_level", upload.single("uploadFile"), controller.uploadGradeSheet); // Upload grade sheet

module.exports = router;
