const { startConnection, endConnection } = require("../config/conn");
const FacultyService = {
    getFacultyBySchoolYearAndSemester: async (req, res) => {
        const { school_year, semester } = req.query;
        const { accessLevel } = req.cookies;
        const conn = await startConnection(req);
        try {
          const [rows] = await conn.query(`SELECT DISTINCT
                                    e.id,
                                    f.lastname as lastName,
                                    f.firstname as firstName,
                                    e.email,
                                    e.college_code,
                                    e.faculty_id,
                                    e.status
                                    FROM emails e
                                    INNER join faculty f
                                    USING(faculty_id)
                                    INNER JOIN class c
                                    ON 
                                        school_year = ? AND
                                        semester = ? AND
                                        c.faculty_id = e.faculty_id`,
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