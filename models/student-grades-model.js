// Function to insert a modified event log entry
const insertModifiedEventLog = async (
  conn,
  tableName,
  tableNameToModify,
  userName,
  department,
  ipAddress
) => {
  const [rows] = await conn.query(
    `INSERT INTO ${tableName} (table_name, user, datetimestamp, department, ipadd) 
        VALUES(?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    [tableNameToModify, userName, department, ipAddress]
  );
  return rows.insertId;
};

// Function to insert an update log entry
const insertUpdateLog = async (conn, classCode, method, termType) => {
  await conn.query(
    `INSERT INTO updates (class_code, method, term_type) VALUES (?, ?, ?)`,
    [classCode, method, termType]
  );
};

// Function to insert a grade log entry
const insertGradeLog = async (conn, student_grades_id) => {
  await conn.execute(
    "INSERT INTO grade_logs (student_grades_id, status) VALUES (?, ?)",
    [student_grades_id, "NP"]
  );
};

// Function to get the subject code by class code
const getSubjectCodeByClassCode = async (conn, class_code) => {
  const [cls] = await conn.query(
    "SELECT subject_code FROM class WHERE class_code = ?",
    [class_code]
  );
  return cls[0]?.subject_code;
};

// Function to get students with grades by class code
const getUndergradGradesByClassCode = async (conn, classCode) => {
  const [rows] = await conn.query(
    `SELECT 
          sg.student_grades_id as sg_id, 
          s.student_id, 
          CONCAT(s.student_lastname , ', ', s.student_firstname, ' ', s.student_middlename) as name, 
          FORMAT(sg.mid_grade,0) as mid_grade, 
          FORMAT(sg.final_grade,0) as final_grade, 
          sg.remarks as dbRemark
      FROM class c 
      INNER JOIN student_load sl ON c.class_code = sl.class_code 
      INNER JOIN student s ON sl.student_id = s.student_id
      INNER JOIN student_grades sg ON sg.student_id = s.student_id
      WHERE 
        c.class_code = ? 
        AND sg.subject_code = c.subject_code
        AND sg.school_year = c.school_year
        AND sg.semester = c.semester
        ORDER BY name`,
    [classCode]
  );

  return rows;
};

// Function to update student grades by ID
const updateGradeById = async (conn, grade, modifiedEventKey) => {
  const [result] = await conn.query(
    `UPDATE 
        student_grades AS sg JOIN ${`subject`} AS subj ON sg.subject_code = ${`subj`}.subject_code
      SET 
        sg.mid_grade = ?, 
        sg.final_grade = ?, 
        sg.grade = ?, 
        sg.remarks = ?, 
        sg.credit = ${grade.credits}, 
        sg.modified_eventkey = ? 
      WHERE 
        student_grades_id = ?`,
    [
      grade.midterm_grade,
      grade.endterm_grade,
      grade.grade,
      grade.remarks,
      modifiedEventKey,
      grade.student_grades_id,
    ]
  );
  return result;
};

const fetchStudentGradeById = async (conn, student_grades_id) => {
  const [result] = await conn.query(
    `SELECT
      mid_grade,
      final_grade,
      grade
      FROM student_grades
      WHERE student_grades_id = ?`,
    [student_grades_id]
  );
  return result;
};
// Function to update a grade row from an uploaded grade sheet
const updateGradeRow = async (conn, data) => {
  const {
    student_grades_id,
    mid_grade,
    final_grade,
    grade,
    remarks,
    hasCredits,
    modifiedEventKey,
    subjectCode,
  } = data;
  const [result] = await conn.query(
    `UPDATE student_grades AS sg
     JOIN subject AS subj ON sg.subject_code = subj.subject_code
     SET 
       sg.mid_grade = ?, 
       sg.final_grade = ?, 
       sg.grade = ?, 
       sg.remarks = ?,
       sg.credit = ${hasCredits},
       sg.modified_eventkey = ?
     WHERE sg.student_grades_id = ? 
     AND sg.subject_code = ?`,
    [
      mid_grade,
      final_grade,
      grade,
      remarks,
      modifiedEventKey,
      student_grades_id,
      subjectCode,
    ]
  );
  if (result.affectedRows > 0) await insertGradeLog(conn, student_grades_id);
  return result;
};

// Function to fetch undergraduate student grades by class code
const fetchGraduateStudiesStudentGrades = async (conn, class_code) => {
  const [rows] = await conn.query(
    `SELECT 
        sg.student_grades_id AS sg_id, 
        s.student_id, 
        CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS name, 
        CASE WHEN sg.grade IS NULL THEN 0 ELSE sg.grade END AS grade, 
        CASE WHEN sg.mid_grade IS NULL THEN 0 ELSE sg.mid_grade END AS mid_grade,
        CASE WHEN sg.final_grade IS NULL THEN 0 ELSE sg.final_grade END AS end_grade,
        sg.remarks AS dbRemark,
        c.status
      FROM class c 
      INNER JOIN student_load sl ON sl.class_code = c.class_code
      INNER JOIN student s ON sl.student_id = s.student_id
      INNER JOIN student_grades sg 
        ON sg.student_id = s.student_id 
        AND sg.subject_code = c.subject_code
        AND sg.school_year = c.school_year
        AND sg.semester = c.semester
      WHERE 
        c.class_code = ?
      ORDER BY name`,
    [class_code]
  );
  return rows;
};

module.exports = {
  insertUpdateLog, // Insert update log in modified_eventlog table
  insertModifiedEventLog, // Insert modified event log in modified_eventlog table
  getSubjectCodeByClassCode,
  getUndergradGradesByClassCode, // Fetch undergraduate student(s) grade(s) in student_grades table
  updateGradeById, // Update undergraduate student(s) grade(s) in student_grades table
  fetchStudentGradeById, // Fetch undergraduate student grade by student_grades_id
  updateGradeRow, // Update undergraduate student(s) grade(s) in student_grades table from uploaded grade sheet
  fetchGraduateStudiesStudentGrades, // Fetch graduate studies student(s) grade(s) in student_grades table
};
