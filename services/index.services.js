const isNaNOrNullOrEmpty = (value) => {
  return isNaN(value) || value === null || value === '';
}

const getLoad = async (conn, query, params) => {
    const [rows] = await conn.query(
        `SELECT
              c.class_code, 
              c.status, 
              c.subject_code,
              CONCAT(s.program_code, ' ', s.yearlevel, ' - ', s.section_code) as section,
              COUNT(DISTINCT student_id) as noStudents,
               (SELECT timestamp FROM updates INNER JOIN class USING (class_code) WHERE class_code = c.class_code ORDER BY id DESC LIMIT 1) as timestamp,
               (SELECT method FROM updates INNER JOIN class USING (class_code) WHERE class_code = c.class_code ORDER BY id DESC LIMIT 1) as method,
               (SELECT 
                  ul.timestamp 
                FROM 
                  tbl_class_update_logs ul 
                INNER JOIN 
                  class 
                USING (class_code) 
                WHERE 
                  ul.class_code = c.class_code 
                AND
                  ul.action_type = 'Submitted'
                ORDER BY 
                  ul.timestamp DESC LIMIT 1) as submittedLog,
                CASE 
                  WHEN c.subject_code IN (SELECT subject_code FROM graduate_studies) 
                    THEN true
                    ELSE false
                END as isGraduateStudies
      FROM class c
      INNER JOIN section s USING (section_id)
      INNER JOIN student_load sl USING (class_code)
   
      WHERE faculty_id = ? AND school_year = ? AND semester = ?
       ${query} GROUP BY c.class_code ORDER BY section`, params
      );
      return rows;
}

const getGradeTable = async (conn, decode) => {
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
          c.class_code = '${decode.classCode}'AND 
          sg.subject_code = c.subject_code AND
          sg.school_year = '${decode.currentSchoolYear}' AND 
          sg.semester = '${decode.semester}' 
        GROUP BY name
        ORDER BY name`
      );
      return rows;
} 

const getGraduateStudiesTable = async (conn, decode) => {
    const [rows] = await conn.query(
        `SELECT 
          sg.student_grades_id as sg_id, 
          s.student_id, 
          CONCAT(s.student_lastname, ', ', s.student_firstname, ' ',s.student_middlename) as name, 
          CASE WHEN sg.grade IS NULL THEN 0 ELSE sg.grade END as grade, 
          CASE WHEN sg.mid_grade IS NULL THEN 0 ELSE sg.mid_grade END as mid_grade,
          CASE WHEN sg.final_grade IS NULL THEN 0 ELSE sg.final_grade END as end_grade,
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
          c.class_code = '${decode.classCode}'AND 
          sg.subject_code = c.subject_code AND
          sg.school_year = '${decode.currentSchoolYear}' AND 
          sg.semester = '${decode.semester}' 
        GROUP BY name
        ORDER BY name`
      );
      return rows;
}

const getExcelFile = async (conn, decode) => {
    const [data] = await conn.query(
        `SELECT 
          c.subject_code, 
          sg.student_grades_id, 
          s.student_id, 
          CONCAT(s.student_lastname , ', ', s.student_firstname,' ',s.student_middlename) as name, 
          sg.mid_grade, 
          sg.final_grade, 
          sg.remarks
        FROM class c 
        INNER JOIN student_load sl
          USING (class_code) 
        INNER JOIN student s 
          USING (student_id)
        INNER JOIN student_grades sg
          USING (student_id)
        WHERE 
          c.class_code = '${decode.classCode}'AND 
          sg.subject_code = c.subject_code AND
          sg.school_year = '${decode.currentSchoolYear}' AND 
          sg.semester = '${decode.semester}' 
        GROUP BY name
        ORDER BY name`
    );
    return data;
}

const indexUpdateClassCodeStatus = async (conn, email_used, decodedClassCode) => {
  const [rows] = await conn.query(`UPDATE class SET status = ? WHERE class_code = ?`,[1, decodedClassCode]);
  let response;
  const logClassStatus = rows.changedRows > 0 && await indexInsertClassCodeUpdateLog(conn, email_used, decodedClassCode);
  if(rows.changedRows > 0) {
    response = logClassStatus.affectedRows > 0 ? {"success": true ,"message": "Successfully Updated Status"} : {"success": false ,"message": "Failed to Update"}
  } else {
    response = {success: false, message: "Status Updated", isUpdated: rows.changedRows, isLogged: logClassStatus.affectedRows}
  }
  
  return response;
}

const indexInsertClassCodeUpdateLog = async (conn, email_used, decodedClassCode) => {
  const [rows] = await conn.query(`INSERT INTO tbl_class_update_logs(email_used, action_type, class_code) VALUES(?, ?, ?)`, [email_used, 'Submitted', decodedClassCode ]);
  return rows;
}

const indexInsertMidtermClassCodeUpdateLog = async (conn, email_used, decodedClassCode) => {
  const [rows] = await conn.query(`INSERT INTO tbl_class_update_logs(email_used, action_type, class_code, term_type) VALUES(?, ?, ?, ?)`, [ email_used, 'Submitted', decodedClassCode, 'midterm' ]);
  return rows;
}

const indexUpdateGrade = async (conn, grade, modifiedEventKey) => {
  
  let { sg_id, mid_grade, final_grade, dbRemark, status } = grade;
  // Handle isNaN for mid_grade and final_grade
  mid_grade = isNaNOrNullOrEmpty(mid_grade) ? 0 : mid_grade;
  final_grade = isNaNOrNullOrEmpty(final_grade) ? 0 : final_grade;
  const parsedMidGrade = parseInt(mid_grade);
  const parsedFinalGrade = parseInt(final_grade);
  const checkGrades = parsedMidGrade > 0 && parsedFinalGrade > 0;
  const average = checkGrades ? Math.round((parsedMidGrade + parsedFinalGrade) / 2) : 0;
  const hasCredits = average > 74 ? `(${`subject`}.lec_units + ${`subject`}.lab_units)` : '0';
  const remarks = (status === "passed" || status === 'failed') ? status : dbRemark;
  const queryStatement = `UPDATE 
        student_grades,
        ${`subject`} 
      SET 
        student_grades.mid_grade = ?, 
        student_grades.final_grade = ?, 
        student_grades.remarks = ?, 
        student_grades.grade = ?, 
        student_grades.credit = ${hasCredits}, 
        student_grades.modified_eventkey = ? 
      WHERE 
        student_grades_id = ?`

  const [rows] = await conn.query(queryStatement,
    [
      parsedMidGrade,
      parsedFinalGrade,
      remarks,
      average,
      modifiedEventKey,
      sg_id,
    ]
  );  
  if(rows.affectedRows > 0) {
    await conn.execute(
      "INSERT INTO grade_logs (student_grades_id, status) VALUES(?, ?)",
      [sg_id, "NP"]
    );
  }
  return rows;
}

const indexUpdateGraduateStudiesGrade = async (conn, gradeData, modifiedEventKey) => {
  let { sg_id, mid_grade, end_grade, grade, dbRemark } = gradeData;
  let status = "";
    const parsedGrade = parseFloat(grade);
    if(parsedGrade > 0) {
      status = (parsedGrade >= 1 && parsedGrade <= 2) ? "passed" : "failed";
    }
    const remarks = (status === 'passed' || status === 'failed') ? status : dbRemark;
    const hasCredits = remarks === 'passed' ? `(${`subject`}.lec_units + ${`subject`}.lab_units)` : '0';
  const [rows] = await conn.query(
    `UPDATE 
      student_grades,
      ${`subject`} 
    SET 
      student_grades.mid_grade = ?, 
      student_grades.final_grade = ?, 
      student_grades.grade = ?, 
      student_grades.remarks = ?,
      student_grades.credit=${hasCredits}, 
      student_grades.modified_eventkey = ? 
    WHERE 
      student_grades_id = ?`,
    [
      mid_grade,
      end_grade,
      grade,
      remarks,
      modifiedEventKey,
      sg_id,
    ]
  );
  console.log({gradeData, remarks, status, dbRemark});
  if(rows.affectedRows > 0) {
    await conn.execute(
      "INSERT INTO grade_logs (student_grades_id, status) VALUES(?, ?)",
      [sg_id, "NP"]
    );
  }
  return rows;
}
module.exports = {
    getLoad,
    getGradeTable,
    getGraduateStudiesTable,
    getExcelFile,
    indexUpdateClassCodeStatus,
    indexInsertMidtermClassCodeUpdateLog,
    indexUpdateGrade,
    indexUpdateGraduateStudiesGrade
}