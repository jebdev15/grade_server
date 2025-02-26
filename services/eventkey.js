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
    console.log(userName[0].name);
    return userName[0].name
}

const insertModifiedEventLog = async (conn, tableName, tableNameToModify, userName, department, ipAddress) => {
    const [rows] = await conn.query(
        `INSERT INTO ${tableName} (table_name, user, datetimestamp, department, ipadd) 
        VALUES(?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [tableNameToModify, userName, department, ipAddress]
    );
    console.log(rows.insertId);
    return rows.insertId
}

const checkIfHasRemarkInGradeSheet = async (conn, rowData, subjectCode, finalRemark, modifiedEventKey) => {
  const mid_grade = parseFloat(rowData[1]);
  const final_grade = parseFloat(rowData[2]);
  const checkGrades = mid_grade > 0 && final_grade > 0;
  const grade = checkGrades ? Math.round([mid_grade, final_grade].reduce((a,b) => a + b)/2) : 0;
  const remarks = grade > 0  ? 'passed' : 'failed';
  const isRemarkPassed = grade > 74 || finalRemark === 'passed';
  const hasCredits = isRemarkPassed ? `(${`subject`}.lec_units + ${`subject`}.lab_units)` : '0'
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
  const params = [mid_grade, final_grade, grade, finalRemark, modifiedEventKey, rowData[0], subjectCode]
  const [rows] = await conn.query(query,params);
  console.log({'hasChanges': rows.changedRows, 'student_grades_id': rowData[0]});
  return rows;
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
    console.log("eventkey",{'hasChanges': rows.changedRows, student_grades_id, grade, finalRemark});
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