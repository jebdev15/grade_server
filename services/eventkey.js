const { GradeUtil } = require("../utils/gradeUtils");
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

const insertModifiedEventLog = async (conn, tableName, tableNameToModify, userName, department, ipAddress) => {
    const [rows] = await conn.query(
        `INSERT INTO ${tableName} (table_name, user, datetimestamp, department, ipadd) 
        VALUES(?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [tableNameToModify, userName, department, ipAddress]
    );
    return rows.insertId
}

const checkIfHasRemarkInGradeSheet = async (conn, rowData, subjectCode, modifiedEventKey) => {
  const { student_grades_id, mid_grade, final_grade, grade } = GradeUtil.getUploadGrade(rowData);
  const { finalRemark } = GradeUtil.getRemark(rowData, grade);
  const { hasCredits } = GradeUtil.getUploadRemark(grade, finalRemark);
  try {
    const query = `UPDATE 
              student_grades, 
              ${`subject`}
            SET 
              student_grades.mid_grade = ?, 
              student_grades.final_grade = ?, 
              student_grades.grade = ?, 
              student_grades.remarks = ?,
              student_grades.credit = ${hasCredits},
              student_grades.modified_eventkey = ?
            WHERE 
              student_grades.student_grades_id = ? 
            AND 
              student_grades.subject_code = ?`
    const params = [mid_grade, final_grade, grade, finalRemark, modifiedEventKey, student_grades_id, subjectCode]
    const [rows] = await conn.query(query,params);
    return rows;
  } catch (error) {
    console.error({error, message: error.message});
    return [];
  }
}

const checkIfHasRemarkInGSGradeSheet = async (conn, rowData, subjectCode, modifiedEventKey) => {
  try {
    const { student_grades_id, mid_grade, final_grade, grade } = GradeUtil.getGSUploadGrade(rowData);
    const { finalRemark } = GradeUtil.getGSRemark(rowData, grade);
    const { hasCredits } = GradeUtil.getGSUploadRemark(grade, finalRemark);
    const query = `UPDATE 
                    student_grades, 
                    ${`subject`}
                  SET 
                    student_grades.mid_grade = ?, 
                    student_grades.final_grade = ?, 
                    student_grades.grade = ?, 
                    student_grades.remarks = ?,
                    student_grades.credit = ${hasCredits},
                    student_grades.modified_eventkey = ?
                  WHERE 
                    student_grades.student_grades_id = ? 
                  AND 
                    student_grades.subject_code = ?`
    const params = [mid_grade, final_grade, grade, finalRemark, modifiedEventKey, student_grades_id, subjectCode]
    const [rows] = await conn.query(query,params);
    return rows;
  } catch (error) {
    console.error({error, message: error.message});
    return rows;
  }
}

module.exports = {
    eventkeyUserEmailRef,
    insertModifiedEventLog,
    checkIfHasRemarkInGradeSheet,
    checkIfHasRemarkInGSGradeSheet
}