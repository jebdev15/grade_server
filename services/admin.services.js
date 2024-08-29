const { urlDecode } = require("url-encode-base64");
const { getStudentsAllowedAccessLevels } = require("../utils/admin.utils");

const getCurrentSchedule = async (conn) => {
    const [rows] = await conn.query(`select * from registrar_activity`);
    return rows.length > 0 ? rows : [];
}


const getEmails = async (conn) => {
  const [rows] = await conn.query(
      `select 
      e.id,
      f.lastname as lastName,
      f.firstname as firstName,
      e.email,
      e.college_code,
      e.faculty_id,
      e.status
      from emails e
      inner join faculty f
      using(faculty_id)`
  );
  return rows.length > 0 ? rows : [];
}

const getEmailsPerCollegeCode = async (conn, college_code) => {
  const [rows] = await conn.query(
      `select 
      e.id,
      f.lastname as lastName,
      f.firstname as firstName,
      e.email,
      e.college_code,
      e.faculty_id,
      e.status
      from emails e
      inner join faculty f
      on e.faculty_id = f.faculty_id
      where e.college_code = ?
      ORDER BY f.lastname DESC
      `,[college_code]
  );
  return rows.length > 0 ? rows : [];
}

const getAllEmails = async (conn) => {
    const [rows] = await conn.query(
        `select 
        e.id,
        f.lastname as lastName,
        f.firstname as firstName,
        e.email,
        e.college_code,
        e.faculty_id,
        e.accessLevel,
        e.program_code,
        CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END as status
        from emails as e 
        LEFT JOIN faculty as f 
        USING(faculty_id) 
        GROUP BY e.id
        ORDER BY e.id ASC
        `
      );
      return rows.length > 0 ? rows : [];
}

const getSubjectLoad = async (conn, sqlParams, params) => {
    const [rows] = await conn.query(
        `SELECT 
          c.class_code as id, 
          c.subject_code,
          CONCAT(s.program_code, ' ', s.yearlevel, ' - ', s.section_code) as section,
          COUNT(DISTINCT student_id) as noStudents,
          c.status,
          (SELECT timestamp FROM updates u WHERE u.class_code = c.class_code ORDER BY id DESC LIMIT 1) as timestamp,
          (SELECT method FROM updates u WHERE u.class_code = c.class_code ORDER BY u.id DESC LIMIT 1) as method,
          (SELECT 
              ul.timestamp 
            FROM 
              tbl_class_update_logs ul 
            WHERE 
              ul.class_code = c.class_code 
            AND
              ul.action_type = 'Submitted'
            ORDER BY 
              ul.timestamp DESC LIMIT 1) as submittedLog
      FROM 
        class c
      INNER JOIN 
        section s 
      USING (section_id)
      INNER JOIN 
        student_load sl 
      USING (class_code)
      WHERE c.faculty_id = ? AND c.school_year = ? AND c.semester = ?
       ${sqlParams} GROUP BY c.class_code ORDER BY section`,
       params
      );
      const data = rows.length > 0 ? rows : [];
      return data
}

const getGradeTableService = async (conn, decode) => {
    
    const [rows] = await conn.query(
        `SELECT 
          sg.student_grades_id as id, 
          s.student_id, 
          CONCAT(s.student_lastname , ', ', s.student_firstname) as name, 
          sg.mid_grade,
          sg.final_grade,
          sg.grade,
          sg.credit,
          sg.remarks,
          (SELECT 
            mel.user 
          FROM 
            modified_eventlog mel 
          WHERE 
            mel.modified_eventkey = sg.modified_eventkey) as encoder,
          (SELECT 
            mel.datetimestamp 
          FROM 
            modified_eventlog mel 
          WHERE 
            mel.modified_eventkey = sg.modified_eventkey) as timestamp,
          sg.modified_eventkey
        FROM class c 
        INNER JOIN student_load sl
          USING (class_code) 
        INNER JOIN student s 
          USING (student_id)
        INNER JOIN student_grades sg
          USING (student_id)
        WHERE 
          c.class_code = '${decode.classCode}'AND 
          sg.subject_code = c.subject_code
        GROUP BY name
        ORDER BY name`
      );
      return rows;
} 

const getGradeSubmissionLogs = async (conn, class_code) => {
    const [rows] = await conn.query(
        `select
          u.id,
          u.timestamp,
          u.method
          from class c
          inner join updates u
          using(class_code)
          where class_code = ?
        `,
        [urlDecode(class_code)]
      );
      return rows.length > 0 ? rows : [];
}

const getAllNoAccounts = async (conn) => {
    const [data] = await conn.query(`SELECT * FROM faculty WHERE faculty_id NOT IN(SELECT faculty_id FROM emails) AND faculty.status<>? ORDER BY faculty.lastname`,['deleted'])
    return data.length > 0 ? data : [];
}

const updateClassCodeStatus = async (conn, newStatus, classCodeDecode) => {
    const [rows] = await conn.query(`UPDATE class SET status = ? WHERE class_code = ?`,[newStatus, classCodeDecode]);
    return rows;
}

const insertClassCodeUpdateLog = async (conn, email_used, newStatus, classCodeDecode) => {
    const [logClassStatus] = await conn.query(`INSERT INTO tbl_class_update_logs(email_used, action_type, class_code) VALUES(?, ?, ?)`, [email_used, newStatus ? 'Locked' : 'Unlocked', classCodeDecode ]);
    return logClassStatus
}

const getColleges = async (conn) => {
    const [rows] = await conn.query(`SELECT * FROM college`)
    return rows
}

const checkNewCollege = async (conn, college_code, college_desc) => {
    const [rows] = await conn.query(`SELECT * FROM college WHERE college_code = ? AND college_desc = ?`, [college_code, , college_desc]);
    return rows
}
const saveCollege = async (conn, college_code, college_desc) => {
    const [rows] = await conn.query(`INSERT INTO college VALUES(?,?)`, [college_code, college_desc]);
    return rows
}

const getProgramCodes = async (conn) => {
    const [rows] = await conn.query(`SELECT 
      curriculum_id, 
      program_code 
      FROM 
        curriculum 
      WHERE 
        curriculum_title 
      LIKE "%New Curriculum%" 
      AND program_code NOT LIKE "BS%"
      AND program_code NOT LIKE "BT%"
      AND program_code NOT LIKE "AB%"
      AND program_code NOT LIKE "BA%"
      AND program_code NOT LIKE "BE%"
      AND program_code NOT LIKE "BP%"
      AND program_code NOT LIKE "TCP%"`)
    return rows
}

const getSubjectCodes = async (conn, curriculum_id) => {
    const [rows] = await conn.query(`SELECT 
      DISTINCT subject_code 
      FROM 
      curriculum_subjects
      WHERE 
      curriculum_id = ?
      AND subject_code NOT IN(SELECT subject_code FROM graduate_studies)
      ORDER BY subject_code DESC`, [curriculum_id])
    return rows
}

const saveSubjectCode = async (conn, subject_code) => {
    const [rows] = await conn.query(`INSERT INTO graduate_studies(subject_code) VALUES(?)`, [subject_code]);
    return rows
}

const getDeadlineLogs = async (conn) => {
    const [rows] = await conn.query(`SELECT * FROM deadline_log ORDER BY id DESC`)
    return rows
}

const getClassCodeDetails = async (conn, req) => {
  const { class_code } = req.query;
  const classCode = urlDecode(class_code);
  const query = `
    SELECT  
      CONCAT(f.lastname,' ',f.firstname) as instructor,
      CONCAT(c.subject_code, ' - ', sub.descriptive_title) as subject,
      CONCAT(s.program_code,' ',s.yearlevel,' - ',s.section_code) as section,
      (SELECT 
        major.major_title
      FROM 
        student_grades
      INNER JOIN 
        section 
      USING(program_code)
      INNER JOIN 
        major
      USING(major_code)
      LIMIT 1) AS major
    FROM 
      class c 
    INNER JOIN 
      faculty f 
    USING (faculty_id)
    INNER JOIN 
      section s
    USING (section_id)
    INNER JOIN
      subject sub
    USING (subject_code)
    WHERE 
      c.class_code = ?`
    const [rows] = await conn.query(query, [classCode]);
    return rows
}

const getClassStudents = async (conn, req) => {
  const { class_code } = req.query;
  const classCode = urlDecode(class_code);
  const query = `
      SELECT 
        sg.student_id as studentID,
      CONCAT(s.student_lastname , ', ', s.student_firstname) as studentName, 
      CASE 
        WHEN sg.mid_grade = 0 THEN '' 
        WHEN sg.mid_grade BETWEEN 1 AND 3 THEN FORMAT(sg.mid_grade,2)
        ELSE FORMAT(sg.mid_grade,0) 
      END as midTermGrade, 
      CASE 
        WHEN sg.final_grade = 0 THEN '' 
        WHEN sg.final_grade BETWEEN 1 AND 3 THEN FORMAT(sg.final_grade,2)
        ELSE FORMAT(sg.final_grade,0) 
      END as endTermGrade, 
      CASE 
        WHEN sg.grade = 0 THEN '' 
        ELSE FORMAT(sg.grade, 0) 
      END as finalGrade, 
      sg.remarks
    FROM 
      class c 
    INNER JOIN 
      student_load sl
    USING (class_code) 
    INNER JOIN 
      student s 
    USING (student_id)
    INNER JOIN 
      student_grades sg
    USING (student_id)
    WHERE 
      class_code = ?
    AND 
      sg.subject_code = c.subject_code 
    GROUP BY studentName
    ORDER BY studentName`
    const [rows] = await conn.query(query, [classCode]); 
    return rows
}

const getStudentsInitialData = async (conn, req) => {
    const query = `
      SELECT 
        s.student_id AS id,
        CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS fullName,
        CONCAT(curr.program_code, '-',cm.major_code) as programMajor,
        latestStatus.status
      FROM 
        student s
      INNER JOIN (
        SELECT 
          student_id,
          status
        FROM 
          student_status
        WHERE
          student_status_id IN (
            SELECT 
              MAX(student_status_id) AS latest_status_id
            FROM 
              student_status
            GROUP BY 
              student_id
          )
      ) AS latestStatus ON s.student_id = latestStatus.student_id
      LEFT JOIN 
        curriculum_major cm
      USING (curriculum_major_id)
      LEFT JOIN
        curriculum curr
      USING (curriculum_id)
      ORDER BY 
        s.student_id
      DESC;
    `
  const [rows] = await conn.query(query);
  return rows
}

const getStudentGrades = async (conn, req) => {
    const query = `
      SELECT 
        sg.student_grades_id as id,
        sg.subject_code,
        sg.grade,
        sg.credit,
        sg.remarks,
        mel.user as encoder
      FROM 
        student_grades sg
      INNER JOIN 
        student s
      USING (student_id)
      INNER JOIN modified_eventlog mel
      ON mel.modified_eventkey = sg.modified_eventkey
      WHERE 
        sg.student_id = ? AND
        sg.year_level = ? AND
        sg.semester = ? AND
        sg.school_year = ?
      ORDER BY 
        sg.student_grades_id
      DESC
    `
  const [rows] = await conn.query(query, [req.query.student_id, req.query.year_level, req.query.semester, req.query.school_year]);
  return rows
}


const getStudentYearSemesterAndSchoolYear = async (conn, req) => {
  const query = `
    SELECT 
      DISTINCT sg.year_level,
      sg.semester,
      sg.school_year,
      sg.student_id
    FROM 
      student_grades sg
    WHERE 
      sg.student_id = ?
    GROUP BY 
      sg.year_level, sg.semester, sg.school_year
  `
const [rows] = await conn.query(query, [req.query.student_id]);
return rows
}

const getStudentsBySearch = async (conn, req) => {
  const { searchParam } = req.body
  const { accessLevel, college_code, program_code } = req.cookies
  let query;
  let queryParams;
  if(accessLevel === 'Administrator' || accessLevel === 'Registrar') {
    console.log({accessLevel: 'Administrator OR Registrar', college_code, program_code});
    query = `
    SELECT 
        s.student_id AS id,
        CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS fullName,
        CONCAT(curr.program_code, '-',cm.major_code) as programMajor,
        latestStatus.status
      FROM 
        student s
      INNER JOIN (
        SELECT 
          student_id,
          status
        FROM 
          student_status
        WHERE
          student_status_id IN (
            SELECT 
              MAX(student_status_id) AS latest_status_id
            FROM 
              student_status
            GROUP BY 
              student_id
          )
      ) AS latestStatus ON s.student_id = latestStatus.student_id
      LEFT JOIN 
        curriculum_major cm
      USING (curriculum_major_id)
      LEFT JOIN
        curriculum curr
      USING (curriculum_id)
      WHERE 
        s.student_id LIKE ? OR
        s.student_lastname LIKE ? OR
        s.student_middlename LIKE ? OR
        s.student_firstname LIKE ?
      ORDER BY 
        s.student_id
      DESC;`;
      queryParams = [`%${searchParam}%`, `%${searchParam}%`, `%${searchParam}%`, `%${searchParam}%`];
  } else if(accessLevel === 'Dean') {
    console.log({accessLevel: 'Dean', college_code, program_code});
    query = `
    SELECT 
        s.student_id AS id,
        CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS fullName,
        CONCAT(curr.program_code, '-',cm.major_code) as programMajor,
        p.college_code,
        latestStatus.status
      FROM 
        student s
      INNER JOIN (
        SELECT 
          student_id,
          status
        FROM 
          student_status
        WHERE
          student_status_id IN (
            SELECT 
              MAX(student_status_id) AS latest_status_id
            FROM 
              student_status
            GROUP BY 
              student_id
          )
      ) AS latestStatus ON s.student_id = latestStatus.student_id
      INNER JOIN 
        curriculum_major cm
      ON cm.curriculum_major_id = s.curriculum_major_id
      INNER JOIN
        curriculum curr
      ON curr.curriculum_id = cm.curriculum_id
      INNER JOIN
        program p
      ON p.program_code = curr.program_code
      WHERE 
        p.college_code = ? AND (
          s.student_id LIKE ? OR
          s.student_lastname LIKE ? OR
          s.student_middlename LIKE ? OR
          s.student_firstname LIKE ?
        )
      ORDER BY 
        s.student_id
      DESC;`
      queryParams = [college_code, `%${searchParam}%`, `%${searchParam}%`, `%${searchParam}%`, `%${searchParam}%`];
  } else if(accessLevel === 'Chairperson') {
    console.log({accessLevel: 'Chairperson', college_code, program_code});
    query = `
    SELECT 
        s.student_id AS id,
        CONCAT(s.student_lastname, ', ', s.student_firstname, ' ', s.student_middlename) AS fullName,
        CONCAT(curr.program_code, '-',cm.major_code) as programMajor,
        p.college_code,
        latestStatus.status
      FROM 
        student s
      INNER JOIN (
        SELECT 
          student_id,
          status
        FROM 
          student_status
        WHERE
          student_status_id IN (
            SELECT 
              MAX(student_status_id) AS latest_status_id
            FROM 
              student_status
            GROUP BY 
              student_id
          )
      ) AS latestStatus ON s.student_id = latestStatus.student_id
      INNER JOIN 
        curriculum_major cm
      ON cm.curriculum_major_id = s.curriculum_major_id
      INNER JOIN
        curriculum curr
      ON curr.curriculum_id = cm.curriculum_id
      INNER JOIN
        program p
      ON p.program_code = curr.program_code
      WHERE 
        p.program_code = ? AND (
          s.student_id LIKE ? OR
          s.student_lastname LIKE ? OR
          s.student_middlename LIKE ? OR
          s.student_firstname LIKE ?
        )
      ORDER BY 
        s.student_id
      DESC;`
      queryParams = [program_code, `%${searchParam}%`, `%${searchParam}%`, `%${searchParam}%`, `%${searchParam}%`];
  }
  
  const [rows] = await conn.query(query, queryParams);
  return rows.length > 0 ? rows : []
}

const getProgramCodesByCampus = async (conn) => {
  const [rows] = await conn.query(`SELECT 
    curriculum_id, 
    program_code 
    FROM 
      curriculum 
    WHERE 
      curriculum_title 
    LIKE "%New Curriculum%"`)
  return rows.length > 0 ? rows : []
}

module.exports = {
    getCurrentSchedule,
    getEmails,
    getEmailsPerCollegeCode,
    getAllEmails,
    getSubjectLoad,
    getGradeTableService,
    getGradeSubmissionLogs,
    getAllNoAccounts,
    updateClassCodeStatus,
    insertClassCodeUpdateLog,
    getColleges,
    checkNewCollege,
    saveCollege,
    getProgramCodes,
    getSubjectCodes,
    getDeadlineLogs,
    saveSubjectCode,
    getClassCodeDetails,
    getClassStudents,
    getStudentsInitialData,
    getStudentGrades,
    getStudentYearSemesterAndSchoolYear,
    getStudentsBySearch,
    getProgramCodesByCampus
}