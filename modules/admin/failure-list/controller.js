/**
 * Admin Controller
 * HTTP request/response handlers for admin operations
 */

const adminService = require("./service");

const getFailureListWindowHandler = async (req, res) => {
  const conn = req.db;
  const { school_year, semester, term_type } = req.query;
  try {
    const window = await adminService.getWindow(conn, school_year, semester, term_type);
    res.status(200).json({ window });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listFailureListWindowsHandler = async (req, res) => {
  const conn = req.db;
  try {
    const windows = await adminService.listWindows(conn);
    res.status(200).json({ windows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upsertFailureListWindowHandler = async (req, res) => {
  const conn = req.db;
  const { school_year, semester, term_type, start_date, end_date, post_deadline_action } = req.body;
  try {
    const rows = await adminService.saveWindow(conn, {
      school_year,
      semester,
      term_type,
      start_date,
      end_date,
      post_deadline_action,
    });
    res.status(200).json({ message: "Window saved", rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteFailureListWindowHandler = async (req, res) => {
  const conn = req.db;
  const { id } = req.params;
  try {
    const rows = await adminService.deleteWindow(conn, id);
    res.status(200).json({ message: "Window deleted", rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getFailureListRosterHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type } = req.query;
  try {
    const result = await adminService.getClassRoster(conn, class_code, term_type);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const adminUpsertFailureListHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type, status, students } = req.body;
  try {
    await conn.beginTransaction();
    const failureListId = await adminService.upsertFailureList(
      conn,
      class_code,
      term_type,
      students,
      status || "draft"
    );
    await conn.commit();
    res.status(200).json({ message: "List updated", failure_list_id: failureListId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  }
};

const adminDeleteFailureListHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type } = req.query;
  try {
    await adminService.deleteFailureList(conn, class_code, term_type);
    res.status(200).json({ message: "List removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFailureListWindowHandler,
  listFailureListWindowsHandler,
  upsertFailureListWindowHandler,
  deleteFailureListWindowHandler,
  getFailureListRosterHandler,
  adminUpsertFailureListHandler,
  adminDeleteFailureListHandler,
};
