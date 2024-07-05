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
  let query;
  let params;
  if(finalRemark === '') {
    query = `UPDATE 
              student_grades, 
              ${`subject`}
            SET 
              student_grades.mid_grade = ?, 
              student_grades.final_grade = ?, 
              student_grades.grade = ?, 
              student_grades.remarks = ? 
            WHERE 
              student_grades.student_grades_id = ? 
            AND 
              student_grades.subject_code = ?`
    params = [rowData[1], rowData[2], rowData[3], finalRemark, rowData[0], subjectCode]
  } else {
    query = `UPDATE 
              student_grades, 
              ${`subject`}
            SET 
              student_grades.mid_grade = ?, 
              student_grades.final_grade = ?, 
              student_grades.grade = ?, 
              student_grades.remarks = ?, 
              student_grades.credit = (${`subject`}.lec_units + ${`subject`}.lab_units), 
              student_grades.modified_eventkey = ?
            WHERE 
              student_grades.student_grades_id = ? 
            AND 
              student_grades.subject_code = ?`
    params = [rowData[1], rowData[2], rowData[3], finalRemark, modifiedEventKey, rowData[0], subjectCode]
  }
  const [rows, fields] = await conn.query(query,params);
  console.log({'hasChanges': rows.changedRows, 'student_grades_id': rowData[0]});
  return rows;
}

module.exports = {
    eventkeyUserEmailRef,
    insertModifiedEventLog,
    checkIfHasRemarkInGradeSheet
}