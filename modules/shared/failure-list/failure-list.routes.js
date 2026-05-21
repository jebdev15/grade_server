const express = require("express");
const router = express.Router();
const { startConnection, endConnection } = require("../../../config/conn");
const controller = require("./failure-list.controller");

const withDb = (handler) => async (req, res) => {
  const conn = await startConnection(req);
  req.db = conn;
  try {
    await handler(req, res);
  } finally {
    await endConnection(conn);
  }
};

// Window management
router.get("/window", withDb(controller.getFailureListWindowHandler));
router.post("/window", withDb(controller.upsertFailureListWindowHandler));
router.delete("/window/:id", withDb(controller.deleteFailureListWindowHandler));

// Faculty endpoints
router.get("/class", withDb(controller.getFailureListRosterHandler));
router.post("/class/submit", withDb(controller.submitFailureListHandler));

// Admin endpoints
router.put("/admin/class", withDb(controller.adminUpsertFailureListHandler));
router.delete("/admin/class", withDb(controller.adminDeleteFailureListHandler));

module.exports = router;
