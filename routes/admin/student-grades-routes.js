const express = require("express");
const router = express.Router();
const {
  getStudentsWithGradesByClassCode
} = require("../../controllers/student-grades-controller");

router.get('/:class_code', getStudentsWithGradesByClassCode);

module.exports = router;