const getStudentsWithGradesByClassCode = async (conn, classCode) => {
  const [rows] = await conn.query(
    `SELECT 
        sg.student_grades_id AS id, 
        s.student_id, 
        CONCAT(TRIM(s.student_lastname), ', ', TRIM(s.student_firstname), ' ', TRIM(s.student_middlename)) AS name, 
        sg.mid_grade,
        sg.final_grade,
        sg.grade,
        sg.credit,
        sg.remarks,
        mel.user AS encoder,
        mel.datetimestamp AS timestamp,
        sg.modified_eventkey
      FROM class c 
      INNER JOIN student_load sl ON c.class_code = sl.class_code 
      INNER JOIN student s ON sl.student_id = s.student_id
      INNER JOIN student_grades sg ON sg.student_id = s.student_id
      LEFT JOIN modified_eventlog mel ON mel.modified_eventkey = sg.modified_eventkey
      WHERE 
        c.class_code = ? 
        AND sg.subject_code = c.subject_code
        AND sg.school_year = c.school_year
        AND sg.semester = c.semester
      ORDER BY name`
  , [classCode]);

  return rows;
};

module.exports = {
  getStudentsWithGradesByClassCode,
};
