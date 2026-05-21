/**
 * Faculty Routes
 * Route definitions for faculty operations
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

// Roster (faculty)
router.get("/class", withDb(controller.getFailureListRosterHandler));

// Submit list (faculty)
router.post("/submit", withDb(controller.submitFailureListHandler));

module.exports = router;
