const {
  fetchClassInfo,
  getFailureListWindow,
  upsertFailureListWindow,
  deleteFailureListWindow,
  getFailureListRoster,
  getFailureListPolicy,
  upsertFailureList,
  applyAutoPassForNonListed,
} = require("./failure-list.service");

const getFailureListWindowHandler = async (req, res) => {
  const conn = req.db;
  const { school_year, semester, term_type } = req.query;
  try {
    const window = await getFailureListWindow(conn, school_year, semester, term_type);
    res.status(200).json({ window });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upsertFailureListWindowHandler = async (req, res) => {
  const conn = req.db;
  const { school_year, semester, term_type, start_date, end_date, post_deadline_action } = req.body;
  try {
    const rows = await upsertFailureListWindow(conn, {
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
    const rows = await deleteFailureListWindow(conn, id);
    res.status(200).json({ message: "Window deleted", rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getFailureListRosterHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type } = req.query;
  try {
    const result = await getFailureListRoster(conn, class_code, term_type);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const submitFailureListHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type, students } = req.body;
  try {
    const policy = await getFailureListPolicy(conn, class_code, term_type);
    if (!policy.isApplicable) {
      return res.status(400).json({ error: "List of Failures is not applicable for this class." });
    }
    if (!policy.window || !policy.isWindowOpen) {
      return res.status(400).json({ error: "List of Failures submission window is closed." });
    }

    await conn.beginTransaction();
    const failureListId = await upsertFailureList(
      conn,
      policy.classInfo,
      term_type,
      students,
      "submitted"
    );

    if (policy.window.post_deadline_action === "auto_pass") {
      await applyAutoPassForNonListed(conn, policy.classInfo, term_type, students);
    }

    await conn.commit();
    res.status(200).json({ message: "List submitted", failure_list_id: failureListId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  }
};

const adminUpsertFailureListHandler = async (req, res) => {
  const conn = req.db;
  const { class_code, term_type, status, students } = req.body;
  try {
    const policy = await getFailureListPolicy(conn, class_code, term_type);
    if (!policy.isApplicable) {
      return res.status(400).json({ error: "List of Failures is not applicable for this class." });
    }

    await conn.beginTransaction();
    const failureListId = await upsertFailureList(
      conn,
      policy.classInfo,
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
    const classInfo = await fetchClassInfo(conn, class_code);
    if (!classInfo) {
      return res.status(404).json({ error: "Class not found." });
    }
    const list = await getFailureListPolicy(conn, class_code, term_type);
    if (!list.list) {
      return res.status(404).json({ error: "No list found." });
    }
    await conn.query("DELETE FROM failure_list WHERE failure_list_id = ?", [list.list.failure_list_id]);
    res.status(200).json({ message: "List removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFailureListWindowHandler,
  upsertFailureListWindowHandler,
  deleteFailureListWindowHandler,
  getFailureListRosterHandler,
  submitFailureListHandler,
  adminUpsertFailureListHandler,
  adminDeleteFailureListHandler,
};
