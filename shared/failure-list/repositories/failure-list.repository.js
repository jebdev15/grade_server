/**
 * Failure List Repository
 * Data access layer - all SQL queries for failure-list feature
 */

const { normalizeTermType } = require("../helpers/term.helper");

/**
 * Fetch class information by class code
 * @param {*} conn Database connection
 * @param {string} classCode Class code
 * @returns {Promise<Object|null>} Class info or null
 */
const findClassByCode = async (conn, classCode) => {
  const [rows] = await conn.query(
    `SELECT c.class_code, c.subject_code, c.school_year, c.semester, c.faculty_id, s.program_code
     FROM class c
     INNER JOIN section s ON s.section_id = c.section_id
     WHERE c.class_code = ?
     LIMIT 1`,
    [classCode]
  );
  return rows[0] || null;
};

/**
 * Check if a subject is graduate-level
 * @param {*} conn Database connection
 * @param {string} subjectCode Subject code
 * @returns {Promise<boolean>} True if graduate subject
 */
const isGraduateSubject = async (conn, subjectCode) => {
  const [rows] = await conn.query(
    "SELECT 1 FROM graduate_studies WHERE subject_code = ? LIMIT 1",
    [subjectCode]
  );
  return rows.length > 0;
};

/**
 * Find latest failure-list window by school year and semester
 * @param {*} conn Database connection
 * @param {number} schoolYear School year
 * @param {string} semester Semester
 * @param {string} termType Term type (midterm/endterm)
 * @returns {Promise<Object|null>} Window or null
 */
const findWindowByTermKey = async (conn, schoolYear, semester, termType) => {
  const [rows] = await conn.query(
    `SELECT *
     FROM failure_list_window
     WHERE school_year = ? AND semester = ?
     ORDER BY end_date DESC, id DESC
     LIMIT 1`,
    [schoolYear, semester]
  );
  return rows[0] || null;
};

/**
 * List failure-list windows (latest first)
 * @param {*} conn Database connection
 * @returns {Promise<Array>} Array of windows
 */
const listWindows = async (conn) => {
  const [rows] = await conn.query(
    `SELECT *
     FROM failure_list_window
     ORDER BY end_date DESC, id DESC`
  );
  return rows;
};

/**
 * Save or update failure-list window
 * @param {*} conn Database connection
 * @param {Object} windowData Window data
 * @returns {Promise<Object>} Query result
 */
const saveWindow = async (conn, windowData) => {
  const normalizedTermType = normalizeTermType(windowData.term_type || "endterm");
  const params = [
    windowData.school_year,
    windowData.semester,
    normalizedTermType,
    windowData.start_date,
    windowData.end_date,
    windowData.post_deadline_action,
    windowData.start_date,
    windowData.end_date,
    windowData.post_deadline_action,
  ];
  const [rows] = await conn.query(
    `INSERT INTO failure_list_window
      (school_year, semester, term_type, start_date, end_date, post_deadline_action)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      start_date = ?,
      end_date = ?,
      post_deadline_action = ?`,
    params
  );
  return rows;
};

/**
 * Delete failure-list window by ID
 * @param {*} conn Database connection
 * @param {number} id Window ID
 * @returns {Promise<Object>} Query result
 */
const deleteWindowById = async (conn, id) => {
  const [rows] = await conn.query(
    "DELETE FROM failure_list_window WHERE id = ?",
    [id]
  );
  return rows;
};

/**
 * Find latest failure list by class key
 * @param {*} conn Database connection
 * @param {string} classCode Class code
 * @param {number} schoolYear School year
 * @param {string} semester Semester
 * @param {string} termType Term type
 * @returns {Promise<Object|null>} List or null
 */
const findListByClassKey = async (conn, classCode, schoolYear, semester, termType) => {
  const [rows] = await conn.query(
    `SELECT failure_list_id, status, submitted_at
     FROM failure_list
     WHERE class_code = ? AND school_year = ? AND semester = ?
     ORDER BY submitted_at DESC, failure_list_id DESC
     LIMIT 1`,
    [classCode, schoolYear, semester]
  );
  return rows[0] || null;
};

/**
 * Find students in a failure list
 * @param {*} conn Database connection
 * @param {number} failureListId Failure list ID
 * @returns {Promise<Array>} Array of students
 */
const findStudentsByListId = async (conn, failureListId) => {
  if (!failureListId) return [];
  const [rows] = await conn.query(
    `SELECT student_id, student_grades_id
     FROM failure_list_students
     WHERE failure_list_id = ?`,
    [failureListId]
  );
  return rows;
};

/**
 * Save or update failure list with students
 * @param {*} conn Database connection
 * @param {Object} classInfo Class information
 * @param {string} termType Term type
 * @param {Array} students Selected students
 * @param {string} status List status (draft/submitted)
 * @returns {Promise<number>} Failure list ID
 */
const saveList = async (conn, classInfo, termType, students, status) => {
  const normalizedTermType = normalizeTermType(termType || "endterm");
  const [rows] = await conn.query(
    `INSERT INTO failure_list (class_code, faculty_id, school_year, semester, term_type, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      submitted_at = VALUES(submitted_at)`,
    [
      classInfo.class_code,
      classInfo.faculty_id,
      classInfo.school_year,
      classInfo.semester,
      normalizedTermType,
      status,
      status === "submitted" ? new Date() : null,
    ]
  );

  const failureListId = rows.insertId
    ? rows.insertId
    : (await findListByClassKey(conn, classInfo.class_code, classInfo.school_year, classInfo.semester, normalizedTermType))?.failure_list_id;

  await deleteStudentsByListId(conn, failureListId);

  if (students.length > 0) {
    const values = students.map((student) => [
      failureListId,
      student.student_id,
      student.student_grades_id || null,
    ]);
    await conn.query(
      `INSERT INTO failure_list_students (failure_list_id, student_id, student_grades_id)
       VALUES ?`,
      [values]
    );
  }

  return failureListId;
};

/**
 * Delete all students from a failure list
 * @param {*} conn Database connection
 * @param {number} failureListId Failure list ID
 * @returns {Promise<Object>} Query result
 */
const deleteStudentsByListId = async (conn, failureListId) => {
  const [rows] = await conn.query(
    "DELETE FROM failure_list_students WHERE failure_list_id = ?",
    [failureListId]
  );
  return rows;
};

/**
 * Delete failure list by ID
 * @param {*} conn Database connection
 * @param {number} failureListId Failure list ID
 * @returns {Promise<Object>} Query result
 */
const deleteListById = async (conn, failureListId) => {
  await deleteStudentsByListId(conn, failureListId);
  const [rows] = await conn.query(
    "DELETE FROM failure_list WHERE failure_list_id = ?",
    [failureListId]
  );
  return rows;
};

/**
 * Find class roster with grades
 * @param {*} conn Database connection
 * @param {string} classCode Class code
 * @returns {Promise<Array>} Array of students with grades
 */
const findClassRosterWithGrades = async (conn, classCode) => {
  const [rows] = await conn.query(
    `SELECT
      sg.student_grades_id,
      s.student_id,
      CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS name
     FROM class c
     INNER JOIN student_load sl ON sl.class_code = c.class_code
     INNER JOIN student s ON s.student_id = sl.student_id
     INNER JOIN student_grades sg ON sg.student_id = s.student_id
       AND sg.subject_code = c.subject_code
       AND sg.school_year = c.school_year
       AND sg.semester = c.semester
     WHERE c.class_code = ? AND sl.status = '2'
     ORDER BY name`,
    [classCode]
  );
  return rows;
};

/**
 * Auto-pass non-listed students
 * @param {*} conn Database connection
 * @param {Object} classInfo Class information
 * @param {string} termType Term type
 * @param {Array} selectedStudentIds Selected student IDs
 * @returns {Promise<Object>} Query result
 */
const autoPassNonListedStudents = async (conn, classInfo, termType, selectedStudentIds) => {
  const hasSelected = selectedStudentIds.length > 0;
  const placeholders = hasSelected ? selectedStudentIds.map(() => "?").join(",") : "";
  const params = [
    classInfo.class_code,
    classInfo.subject_code,
    classInfo.school_year,
    classInfo.semester,
  ];

  if (hasSelected) {
    params.push(...selectedStudentIds);
  }

  const excludeClause = hasSelected
    ? `AND sg.student_id NOT IN (${placeholders})`
    : "";

  const [rows] = await conn.query(
    `UPDATE student_grades sg
     INNER JOIN subject subj ON subj.subject_code = sg.subject_code
     INNER JOIN student_load sl ON sl.student_id = sg.student_id AND sl.class_code = ?
     SET
       sg.mid_grade = 75,
       sg.final_grade = 75,
       sg.grade = 75,
       sg.remarks = 'passed',
       sg.credit = (subj.lec_units + subj.lab_units)
     WHERE
       sg.subject_code = ?
       AND sg.school_year = ?
       AND sg.semester = ?
       AND sl.status = '2'
       ${excludeClause}
       AND (sg.mid_grade IS NULL OR sg.mid_grade = 0)
       AND (sg.final_grade IS NULL OR sg.final_grade = 0)`,
    params
  );

  return rows;
};

module.exports = {
  findClassByCode,
  isGraduateSubject,
  findWindowByTermKey,
  listWindows,
  saveWindow,
  deleteWindowById,
  findListByClassKey,
  findStudentsByListId,
  saveList,
  deleteStudentsByListId,
  deleteListById,
  findClassRosterWithGrades,
  autoPassNonListedStudents,
};
