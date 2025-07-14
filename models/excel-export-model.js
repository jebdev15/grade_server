const getGradesData = async (
  conn,
  { class_code, semester, currentSchoolYear }
) => {
  const [rows] = await conn.query(
    `SELECT 
          c.subject_code, 
          sg.student_grades_id, 
          s.student_id, 
          CONCAT(TRIM(s.student_lastname), ', ', TRIM(s.student_firstname),' ',TRIM(s.student_middlename)) as name, 
          sg.mid_grade, 
          sg.final_grade, 
          sg.remarks
        FROM class c 
        INNER JOIN student_load sl
            ON sl.class_code = c.class_code
        INNER JOIN student s 
            ON s.student_id = sl.student_id
        INNER JOIN student_grades sg
            ON sg.student_id = s.student_id
        WHERE 
            c.class_code = ? AND 
            sg.subject_code = c.subject_code AND
            sg.school_year = ? AND 
            sg.semester = ? 
        GROUP BY name
        ORDER BY name`,
    [class_code, currentSchoolYear, semester]
  );

  return rows;
};

const getGraduateStudiesGradesData = async (conn, { class_code, semester, currentSchoolYear}) => {
  const [rows] = await conn.query(
    `SELECT 
      c.subject_code, 
      sg.student_grades_id, 
      s.student_id, 
      CONCAT(TRIM(s.student_lastname), ', ', TRIM(s.student_firstname),' ', TRIM(s.student_middlename)) AS name, 
      sg.mid_grade, 
      sg.final_grade,
      CASE WHEN sg.grade IS NULL OR sg.grade = '' THEN 0 ELSE sg.grade END AS grade, 
      sg.remarks
    FROM class c 
    INNER JOIN student_load sl 
      ON sl.class_code = c.class_code
    INNER JOIN student s 
      ON s.student_id = sl.student_id
    INNER JOIN student_grades sg 
      ON sg.student_id = s.student_id
      AND sg.subject_code = c.subject_code
    WHERE c.class_code = ? 
      AND sg.school_year = ?  
      AND sg.semester = ? 
    ORDER BY name`,
    [class_code, currentSchoolYear, semester]
  );
  return rows;
};
module.exports = {
  getGradesData,
  getGraduateStudiesGradesData,
};
