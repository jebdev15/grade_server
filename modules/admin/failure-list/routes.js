/**
 * Admin Routes
 * Route definitions for admin operations
 */

const express = require("express");
const router = express.Router();
const { startConnection, endConnection } = require("@config/conn");
const controller = require("./controller");

const withDb = (handler) => async (req, res) => {
  const conn = await startConnection(req);
  req.db = conn;
  try {
    await handler(req, res);
  } finally {
    await endConnection(conn);
  }
};

// Window management (admin)
router.get("/window", withDb(controller.getFailureListWindowHandler));
router.get("/window/list", withDb(controller.listFailureListWindowsHandler));
router.post("/window", withDb(controller.upsertFailureListWindowHandler));
router.delete("/window/:id", withDb(controller.deleteFailureListWindowHandler));

// Roster management (admin)
router.get("/class", withDb(controller.getFailureListRosterHandler));

// Failure list management (admin)
router.put("/class", withDb(controller.adminUpsertFailureListHandler));
router.delete("/class", withDb(controller.adminDeleteFailureListHandler));

module.exports = router;
