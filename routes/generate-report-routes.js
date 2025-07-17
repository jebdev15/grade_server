const express = require("express");
const router = express.Router();
const controller = require("../controllers/generate-report-controller");

router.get("/:reportType", controller.generateReport); // Graduate Studies routes

module.exports = router;