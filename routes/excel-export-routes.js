const express = require("express");
const router = express.Router();
const controller = require("../controllers/excel-export-controller");

router.get("/grades", controller.downloadGradesExcel); // Undergraduate Studies routes
router.get("/grades/graduate-studies", controller.downloadGraduateStudiesGradesExcel); // Graduate Studies routes
module.exports = router;