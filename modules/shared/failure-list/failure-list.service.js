const SPECIAL_REMARKS = new Set([
  "inc",
  "drp",
  "na",
  "ng",
  "w",
  "incomplete",
  "dropped",
  "no attendance",
  "no grade",
  "withdrawn",
]);

const normalizeTermType = (value) => {
  if (!value) return value;
  const normalized = String(value).toLowerCase();
  return normalized === "finalterm" ? "endterm" : normalized;
};

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const isUndergradProgram = (programCode) => {
  if (!programCode) return false;
  const upper = programCode.toUpperCase();
  const isUndergradPrefix = /^(BS|BT|BP|BI|BE|AB)/.test(upper);
  const isTcp = upper.includes("TCP");
  return isUndergradPrefix && !isTcp;
};

const fetchClassInfo = async (conn, classCode) => {
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

const isGraduateSubject = async (conn, subjectCode) => {
  const [rows] = await conn.query(
    "SELECT 1 FROM graduate_studies WHERE subject_code = ? LIMIT 1",
    [subjectCode]
  );
  return rows.length > 0;
};

const getFailureListWindow = async (conn, schoolYear, semester, termType) => {
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

const upsertFailureListWindow = async (conn, data) => {
  const normalizedTermType = normalizeTermType(data.term_type || "endterm");
  const params = [
    data.school_year,
    data.semester,
    normalizedTermType,
    data.start_date,
    data.end_date,
    data.post_deadline_action,
    data.start_date,
    data.end_date,
    data.post_deadline_action,
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

const deleteFailureListWindow = async (conn, id) => {
  const [rows] = await conn.query(
    "DELETE FROM failure_list_window WHERE id = ?",
    [id]
  );
  return rows;
};

const getFailureList = async (conn, classInfo, termType) => {
  const [rows] = await conn.query(
    `SELECT failure_list_id, status, submitted_at
     FROM failure_list
     WHERE class_code = ? AND school_year = ? AND semester = ?
     ORDER BY submitted_at DESC, failure_list_id DESC
     LIMIT 1`,
    [
      classInfo.class_code,
      classInfo.school_year,
      classInfo.semester,
    ]
  );
  return rows[0] || null;
};

const getFailureListStudents = async (conn, failureListId) => {
  if (!failureListId) return [];
  const [rows] = await conn.query(
    `SELECT student_id, student_grades_id
     FROM failure_list_students
     WHERE failure_list_id = ?`,
    [failureListId]
  );
  return rows;
};

const getFailureListPolicy = async (conn, classCode, termType) => {
  const normalizedTermType = normalizeTermType(termType || "endterm");
  const classInfo = await fetchClassInfo(conn, classCode);
  if (!classInfo) {
    return { isApplicable: false, reason: "class_not_found" };
  }

  const isGraduate = await isGraduateSubject(conn, classInfo.subject_code);
  const isApplicable = !isGraduate && isUndergradProgram(classInfo.program_code);
  if (!isApplicable) {
    return { isApplicable: false, reason: "program_not_supported" };
  }

  const window = await getFailureListWindow(
    conn,
    classInfo.school_year,
    classInfo.semester,
    normalizedTermType
  );
  const list = await getFailureList(conn, classInfo, normalizedTermType);
  const students = await getFailureListStudents(conn, list?.failure_list_id);

  const today = normalizeDateOnly(new Date());
  const startDate = normalizeDateOnly(window?.start_date);
  const endDate = normalizeDateOnly(window?.end_date);
  const isWindowOpen = !!(startDate && endDate && today >= startDate && today <= endDate);
  const isWindowClosed = !!(endDate && today > endDate);
  const isSubmitted = list?.status === "submitted";

  const studentIds = new Set(students.map((item) => item.student_id));
  const studentGradeIds = new Set(
    students
      .map((item) => item.student_grades_id)
      .filter((value) => value !== null && value !== undefined)
  );

  return {
    isApplicable: true,
    termType: normalizedTermType,
    classInfo,
    window,
    list,
    isWindowOpen,
    isWindowClosed,
    isSubmitted,
    postDeadlineAction: window?.post_deadline_action || "restrict_only",
    selectedStudents: students,
    studentIds,
    studentGradeIds,
  };
};

const getFailureListRoster = async (conn, classCode, termType) => {
  const policy = await getFailureListPolicy(conn, classCode, termType);
  if (!policy.isApplicable) {
    return { policy, students: [] };
  }

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

  const students = rows.map((row) => ({
    student_grades_id: row.student_grades_id,
    student_id: row.student_id,
    name: row.name,
    selected:
      policy.studentGradeIds.has(row.student_grades_id) ||
      policy.studentIds.has(row.student_id),
  }));

  return { policy, students };
};

const upsertFailureList = async (conn, classInfo, termType, students, status) => {
  const normalizedTermType = normalizeTermType(termType);
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
    : (await getFailureList(conn, classInfo, normalizedTermType))?.failure_list_id;

  await conn.query("DELETE FROM failure_list_students WHERE failure_list_id = ?", [
    failureListId,
  ]);

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

const applyAutoPassForNonListed = async (conn, classInfo, termType, students) => {
  const studentIds = students.map((item) => item.student_id);
  const hasSelected = studentIds.length > 0;
  const placeholders = hasSelected ? studentIds.map(() => "?").join(",") : "";
  const params = [
    classInfo.class_code,
    classInfo.subject_code,
    classInfo.school_year,
    classInfo.semester,
  ];

  if (hasSelected) {
    params.push(...studentIds);
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

const enforceFailureListPolicy = (
  policy,
  gradeData,
  contextLabel,
  options = {}
) => {
  if (!policy?.isApplicable) {
    return gradeData;
  }

  const isListed =
    policy.studentGradeIds.has(gradeData.student_grades_id) ||
    policy.studentIds.has(gradeData.student_id);

  const remarks = String(
    gradeData.remarks || gradeData.dbRemark || gradeData.remark || ""
  ).toLowerCase();
  if (SPECIAL_REMARKS.has(remarks)) {
    if (options.restrictSpecialRemarksToListed && !isListed) {
      throw new Error(
        "List of Failures is active. Special remarks are only allowed for listed students."
      );
    }
    return gradeData;
  }

  const mid = Number(gradeData.mid_grade || 0);
  const finalGrade = Number(gradeData.final_grade || 0);
  const averageGrade = Number(gradeData.grade || 0) || (mid > 0 && finalGrade > 0 ? Math.round((mid + finalGrade) / 2) : 0);

  const hasFailingAverage = averageGrade > 0 && averageGrade < 75;
  const hasPassingAverage = averageGrade >= 75;

  const label = contextLabel ? ` (${contextLabel})` : "";

  if (!isListed) {
    const hasFailing = hasFailingAverage;
    if (hasFailing) {
      throw new Error(
        "The List of Failures has been finalized. Only students in the highlighted rows are allowed to receive failing grades."
      );
    }
  }

  if (isListed) {
    const hasPassing = hasPassingAverage;

    if (hasPassing) {
      throw new Error(
        `The List of Failures has been finalized. Students in the highlighted rows must receive failing grades.`
      );
    }
  }

  return gradeData;
};

module.exports = {
  fetchClassInfo,
  getFailureListWindow,
  upsertFailureListWindow,
  deleteFailureListWindow,
  getFailureListPolicy,
  getFailureListRoster,
  upsertFailureList,
  applyAutoPassForNonListed,
  enforceFailureListPolicy,
  isUndergradProgram,
  normalizeTermType,
};
