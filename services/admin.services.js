const { urlDecode } = require("url-encode-base64");

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
        e.faculty_id,
        e.status
        from emails e
        inner join faculty f
        on e.faculty_id = f.faculty_id`
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
        e.faculty_id,
        e.accessLevel,
        CASE WHEN e.status = 1 THEN 'Active' ELSE 'Deactivated' END as status
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
        `SELECT c.class_code as id, 
              c.subject_code,
              CONCAT(s.program_code, ' ', s.yearlevel, ' - ', s.section_code) as section,
              COUNT(DISTINCT student_id) as noStudents,
              c.status
      FROM class c
      INNER JOIN section s USING (section_id)
      INNER JOIN student_load sl USING (class_code)
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
module.exports = {
    getCurrentSchedule,
    getEmails,
    getAllEmails,
    getSubjectLoad,
    getGradeTableService,
    getGradeSubmissionLogs,
    getAllNoAccounts,
    updateClassCodeStatus,
    insertClassCodeUpdateLog
}