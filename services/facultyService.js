const { startConnection, endConnection } = require("../config/conn");
const FacultyService = {
    getFacultyBySchoolYearAndSemester: async (req, res) => {
        const { school_year, semester } = req.query;
        // const { accessLevel } = req.cookies;
        const conn = await startConnection(req);
        try {
          const [rows] = await conn.query(`SELECT 
                                      e.id,
                                      CONCAT(TRIM(f.lastname), ', ', TRIM(f.firstname), ' ', TRIM(f.middlename)) as facultyName,
                                      e.email,
                                      e.college_code,
                                      e.faculty_id,
                                      e.status
                                    FROM emails e
                                    INNER join faculty f
                                    ON f.faculty_id = e.faculty_id
                                    INNER JOIN class c
                                    ON c.faculty_id = e.faculty_id
                                    WHERE c.school_year = ? 
                                    AND c.semester = ?
                                    GROUP BY f.lastname, f.firstname, f.middlename ORDER BY f.lastname, f.firstname, f.middlename`,
                                    [school_year, semester]);
          return rows
        } catch(err) {
          console.error(err.message);
        } finally {
          await endConnection(conn);
        }
    }
}

module.exports = FacultyService