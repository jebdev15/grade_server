/**
 * Faculty Controller
 * HTTP request/response handlers for faculty operations
 */

const facultyService = require("./service");

const getFailureListRosterHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type } = req.query;
  try {
    const result = await facultyService.getRoster(conn, class_code, term_type);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const submitFailureListHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type, students } = req.body;
  try {
    const failureListId = await facultyService.submitList(conn, class_code, term_type, students);
    res.status(200).json({ message: "List submitted", failure_list_id: failureListId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFailureListRosterHandler,
  submitFailureListHandler,
};
