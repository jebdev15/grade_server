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
  const mid_grade = rowData[1];
  const final_grade = rowData[2];
  const checkGrades = mid_grade > 0 && final_grade > 0;
  const grade = checkGrades ? Math.round([mid_grade, final_grade].reduce((a,b) => a + b)/2) : 0;
  let query;
  let params;
  const hasCredits = finalRemark === 'passed' ? `(${`subject`}.lec_units + ${`subject`}.lab_units)` : '0'
  query = `UPDATE 
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
  params = [rowData[1], rowData[2], /*rowData[3]*/grade, finalRemark, modifiedEventKey, rowData[0], subjectCode]
  const [rows, fields] = await conn.query(query,params);
  console.log({'hasChanges': rows.changedRows, 'student_grades_id': rowData[0]});
  return rows;
}

module.exports = {
    eventkeyUserEmailRef,
    insertModifiedEventLog,
    checkIfHasRemarkInGradeSheet
}