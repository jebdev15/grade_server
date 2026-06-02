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

const getCurrentStudentGrade = async (conn, student_grades_id) => {
  const [rows] = await conn.query(
    "SELECT * FROM student_grades WHERE student_grades_id = ?",
    [student_grades_id]
  );
  return rows
}

// fetch credits
const getCredits = async (conn, subject_code) => {
  const [rows] = await conn.query(
    "SELECT (lec_units + lab_units) AS credit FROM subject WHERE subject_code = ?",
    [subject_code]
  );
  return rows[0].credit
}

// Function to get user full name from faculty table using faculty_id as a reference from emails table
const eventkeyUserEmailRef = async (conn, email_used) => {
  const [userName] = await conn.query(
    `SELECT 
          CONCAT(f.firstname, " ",f.lastname) as name 
        FROM 
          faculty f
        INNER JOIN 
          emails e 
        USING(faculty_id)
        WHERE e.email = ?`,
    [email_used]
  );
  return userName[0].name
}

// Functions used by the Faculty

const fetchUndergradStudents = async (conn, { class_code, school_year, semester }) => {
  const [rows] = await conn.query(
    `SELECT 
          sg.student_grades_id as sg_id, 
          s.student_id, 
          CONCAT(s.student_lastname , ', ', s.student_firstname, ' ', s.student_middlename) as name, 
          CASE 
            WHEN sg.mid_grade = 0 THEN '' 
            WHEN sg.mid_grade BETWEEN 1 AND 5 THEN FORMAT(sg.mid_grade,2) 
            ELSE FORMAT(sg.mid_grade,0) 
          END as mid_grade, 
          CASE 
            WHEN sg.final_grade = 0 THEN ''
            WHEN sg.final_grade BETWEEN 1 AND 5 THEN FORMAT(sg.final_grade,2) 
            ELSE FORMAT(sg.final_grade,0) 
          END as final_grade, 
          sg.remarks as dbRemark,
          c.status
        FROM class c 
        INNER JOIN student_load sl
          USING (class_code) 
        INNER JOIN student s 
          USING (student_id)
        INNER JOIN student_grades sg
          USING (student_id)
        WHERE 
          c.class_code = ? AND 
          sg.subject_code = c.subject_code AND
          sg.school_year = ? AND 
          sg.semester = ?
        GROUP BY name
        ORDER BY name`,
    [class_code, school_year, semester]
  );
  return rows;
}
// Function to fetch students
const fetchGraduateStudiesStudents = async (conn, { class_code, school_year, semester }) => {
  const [rows] = await conn.query(
    `SELECT 
      sg.student_grades_id AS sg_id, 
      s.student_id, 
      CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS name, 
      CASE WHEN sg.grade IS NULL THEN 0 ELSE sg.grade END AS grade, 
      CASE WHEN sg.mid_grade IS NULL THEN 0 ELSE sg.mid_grade END AS mid_grade,
      CASE WHEN sg.final_grade IS NULL THEN 0 ELSE sg.final_grade END AS final_grade,
      sg.remarks AS dbRemark
    FROM class c 
    INNER JOIN student_load sl ON sl.class_code = c.class_code
    INNER JOIN student s ON s.student_id = sl.student_id
    INNER JOIN student_grades sg ON sg.student_id = s.student_id AND sg.subject_code = c.subject_code
    WHERE 
      c.class_code = ? AND
      sg.school_year = ? AND 
      sg.semester = ?
    ORDER BY name`,
    [class_code, school_year, semester]
  );

  return rows;
};

// Function to update student grade
const updateStudentGrade = async (conn, grade) => {
  // Replace with your actual query logic
  const query = `
    UPDATE student_grades
    SET 
      mid_grade = ?,
      final_grade = ?,
      grade = ?,
      remarks = ?,
      credit = ?,
      modified_eventkey = ?
    WHERE student_grades_id = ?
  `;

  const params = [
    grade.mid_grade,
    grade.final_grade,
    grade.grade,
    grade.remarks,
    grade.credit,
    grade.modifiedEventKey,
    grade.student_grades_id
  ];

  const [result] = await conn.query(query, params);
  return result;
};

// Functions used by the Administrator

// Function to get the subject code by class code
const getSubjectCodeByClassCode = async (conn, class_code) => {
  const [cls] = await conn.query(
    "SELECT subject_code FROM class WHERE class_code = ?",
    [class_code]
  );
  return cls[0]?.subject_code;
};

// Function to fetch students with no credits
const fetchStudentsWithNoCredits = async (conn, filter) => {
  const [rows] = await conn.query(
    `SELECT * FROM student_grades 
     WHERE credit < 1 
     AND (grade > 74 OR grade BETWEEN 1 AND 2)
     AND school_year = ? 
     AND semester = ?;`,
    [filter.school_year, filter.semester]
  );
  return rows;
};

// Function to update credits for passed students
const updateCreditsForPassedStudents = async (conn, filter) => {
  const [rows] = await conn.query(
    `UPDATE student_grades sg
    JOIN subject s ON sg.subject_code = s.subject_code 
    SET sg.credit = s.lec_units + s.lab_units, sg.remarks = 'passed'
    WHERE
      sg.credit < 1
      AND (grade > 74 OR grade BETWEEN 1 AND 2)
      AND sg.school_year = ? 
      AND sg.semester = ?;`,
    [filter.school_year, filter.semester]
  );
  return rows;
};

// Function to get students with grades by class code
const getUndergradGradesByClassCode = async (conn, classCode) => {
  const [rows] = await conn.query(
    `SELECT 
          sg.student_grades_id as sg_id, 
          s.student_id, 
          CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) as name, 
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
        AND sl.status = '2'
        ORDER BY name`,
    [classCode]
  );

  return rows;
};

// Function to update student grades by ID
const updateGradeById = async (conn, grade) => {
  const [result] = await conn.query(
    `UPDATE 
        student_grades AS sg JOIN ${`subject`} AS subj ON sg.subject_code = ${`subj`}.subject_code
      SET 
        sg.mid_grade = ?, 
        sg.final_grade = ?, 
        sg.grade = ?, 
        sg.remarks = ?, 
        sg.credit = ?, 
        sg.modified_eventkey = ? 
      WHERE 
        student_grades_id = ?`,
    [
      grade.mid_grade,
      grade.final_grade,
      grade.grade,
      grade.remarks,
      grade.credit,
      grade.modified_eventkey,
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
    credit,
    modified_eventkey,
    subject_code,
  } = data;

  const [result] = await conn.query(
    `UPDATE student_grades AS sg
     JOIN subject AS subj ON sg.subject_code = subj.subject_code
     SET 
       sg.mid_grade = ?, 
       sg.final_grade = ?, 
       sg.grade = ?, 
       sg.remarks = ?,
       sg.credit = ?,
       sg.modified_eventkey = ?
     WHERE sg.student_grades_id = ? 
     AND sg.subject_code = ?`,
    [
      mid_grade,
      final_grade,
      grade,
      remarks,
      credit,
      modified_eventkey,
      student_grades_id,
      subject_code,
    ]
  );
  return result;
};

// Function to fetch graduate studies student grades by class code
const fetchGraduateStudiesStudentGrades = async (conn, class_code) => {
  const [rows] = await conn.query(
    `SELECT 
        sg.student_grades_id AS sg_id, 
        s.student_id, 
        CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS name, 
        CASE WHEN sg.grade IS NULL THEN 0 ELSE sg.grade END AS grade, 
        CASE WHEN sg.mid_grade IS NULL THEN 0 ELSE sg.mid_grade END AS mid_grade,
        CASE WHEN sg.final_grade IS NULL THEN 0 ELSE sg.final_grade END AS final_grade,
        sg.remarks AS dbRemark
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
        AND sl.status = '2'
      ORDER BY name`,
    [class_code]
  );
  return rows;
};
module.exports = {
  insertUpdateLog, // Insert update log in modified_eventlog table
  insertModifiedEventLog, // Insert modified event log in modified_eventlog table
  getCurrentStudentGrade, // Get current student grade
  getCredits, // Get credits
  eventkeyUserEmailRef, // Get user full name using email
  fetchUndergradStudents, // Fetch undergraduate students
  fetchGraduateStudiesStudents, // Fetch students with grades. This function is used by the faculty
  updateStudentGrade, // Update student grade. This function is used by the faculty
  getSubjectCodeByClassCode, // Get subject code by class code
  fetchStudentsWithNoCredits, // Fetch students with no credits
  updateCreditsForPassedStudents, // Update credits for passed students
  getUndergradGradesByClassCode, // Fetch undergraduate student(s) grade(s) in student_grades table
  updateGradeById, // Update undergraduate student(s) grade(s) in student_grades table
  fetchStudentGradeById, // Fetch undergraduate student grade by student_grades_id
  updateGradeRow, // Update undergraduate student(s) grade(s) in student_grades table from uploaded grade sheet
  fetchGraduateStudiesStudentGrades, // Fetch graduate studies student(s) grade(s) in student_grades table
};
