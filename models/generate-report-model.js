const fetchGradeSheetSubmissionLog = async (conn, schoolYear, semester) => {
  const query = `
    SELECT 
      CONCAT(TRIM(f.lastname),', ',TRIM(f.firstname)) as fullName,
      c.class_code,
      c.subject_code,
      CONCAT(sec.program_code, ' ', sec.yearlevel, ' - ', sec.section_code) as section,
      COALESCE(u.term_type,cl.term_type) as term_type,
      MAX(u.timestamp) as lastUpdate,
      MAX(CASE WHEN cl.action_type = 'Submitted' THEN cl.timestamp END) AS submittedAt
    FROM updates u
    LEFT JOIN class c ON c.class_code = u.class_code
    LEFT JOIN faculty f ON f.faculty_id = c.faculty_id
    LEFT JOIN section sec ON sec.section_id = c.section_id
    LEFT JOIN tbl_class_update_logs cl 
      ON cl.class_code = u.class_code
      AND cl.term_type = u.term_type
    LEFT JOIN emails e ON e.faculty_id = f.faculty_id
    WHERE c.school_year = ? AND c.semester = ?
    GROUP BY 
      f.lastname, f.firstname, 
      c.class_code, c.subject_code, 
      sec.program_code, sec.yearlevel, sec.section_code, 
      c.school_year, c.semester, u.term_type
    ORDER BY fullName
  `;

  const [rows] = await conn.query(query, [schoolYear, semester]);
  return rows;
};

const fetchDeadlineLog = async (conn, schoolYear, semester) => {
  const query = `
    SELECT * 
    FROM deadline_log 
    WHERE schoolyear = ? AND semester = ? 
    ORDER BY timestamp DESC
  `;
  const [rows] = await conn.query(query, [schoolYear, semester]);
  return rows;
};

const fetchClassStatusLog = async (conn, from, to) => {
  const query = `
    SELECT 
      cl.*,
      CONCAT(sec.program_code, sec.yearlevel, ' - ', sec.section_code) AS section,
      c.school_year,
      c.semester   
    FROM tbl_class_update_logs cl
    LEFT JOIN class c ON cl.class_code = c.class_code 
    LEFT JOIN section sec ON sec.section_id = c.section_id
    WHERE cl.action_type <> 'Submitted'
      AND cl.timestamp BETWEEN ? AND ?
    ORDER BY cl.timestamp DESC
  `;

  const [rows] = await conn.query(query, [from, to]);
  return rows;
};

const fetchAccountLog = async (conn, from, to) => {
  const query = `
    SELECT 
      email_logs.old_faculty_id,
      email_logs.new_faculty_id,
      email_logs.old_email,
      email_logs.new_email,
      email_logs.old_accessLevel,
      email_logs.new_accessLevel,
      CASE WHEN email_logs.old_status = 1 THEN 'Active' ELSE 'Deactivated' END as old_status, 
      CASE WHEN email_logs.new_status = 1 THEN 'Active' ELSE 'Deactivated' END as new_status,
      email_logs.action_type,
      email_logs.email_used,
      email_logs.created_at
    FROM email_logs
    WHERE email_logs.created_at BETWEEN ? AND ?
  `;
  const [rows] = await conn.query(query, [from, to]);
  return rows;
};

const fetchStudentGradeUpdateLog = async (conn, schoolYear, semester) => {
  const query = `
    SELECT
      CONCAT(TRIM(s.student_lastname), ', ', TRIM(s.student_firstname), ' ', TRIM(s.student_middlename)) AS student_name,
      s.student_id,
      sg.subject_code,
      CAST(vsgl.mid_grade AS DECIMAL(5,2)) AS mid_grade,
      CAST(vsgl.final_grade AS DECIMAL(5,2)) AS final_grade,
      CAST(vsgl.prev_grade AS DECIMAL(5,2)) AS previous_grade,
      CAST(vsgl.grade AS DECIMAL(5,2)) AS grade,
      vsgl.remarks,
      CASE WHEN vsgl.credit IS NULL THEN 0 ELSE CAST(vsgl.credit AS DECIMAL(5,1)) END AS credit,
      mel.user AS updated_by,
      mel.datetimestamp AS updated_at
    FROM view_student_grades_log vsgl
    INNER JOIN student_grades sg ON vsgl.student_grades_id = sg.student_grades_id
    INNER JOIN student s ON sg.student_id = s.student_id
    INNER JOIN modified_eventlog mel ON vsgl.modified_eventkey = mel.modified_eventkey
    WHERE sg.school_year = ? AND sg.semester = ? AND vsgl.action_type = 'UPDATE'
    ORDER BY updated_at DESC
  `;

  const [rows] = await conn.query(query, [schoolYear, semester]);
  return rows;
};

module.exports = {
  fetchGradeSheetSubmissionLog,
  fetchDeadlineLog,
  fetchClassStatusLog,
  fetchAccountLog,
  fetchStudentGradeUpdateLog
};