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
                  ul.action_type = 'Locked'
                ORDER BY 
                  ul.timestamp DESC LIMIT 1) as submittedLog
                
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
          CONCAT(s.student_lastname , ', ', s.student_firstname) as name, 
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
          CONCAT(s.student_lastname , ', ', s.student_firstname) as name, 
          sg.grade, 
          sg.mid_grade,
          sg.final_grade as end_grade,
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
          CONCAT(s.student_lastname , ', ', s.student_firstname) as name, 
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
module.exports = {
    getLoad,
    getGradeTable,
    getGraduateStudiesTable,
    getExcelFile
}