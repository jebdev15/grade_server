const { startConnection, endConnection } = require("../config/conn");
const FacultyService = {
  getFacultyBySchoolYearAndSemester: async (req) => {
    const { school_year, semester, accessLevel, college_code } = req.query;
    let query;
    if (accessLevel === 'Administrator' || accessLevel === 'Registrar') {
      query = `SELECT
          e.id,
          CONCAT(
              TRIM(f.lastname),
              ', ',
              TRIM(f.firstname),
              ' ',
              TRIM(f.middlename)
          ) AS facultyName,
          e.email,
          e.college_code,
          e.faculty_id,
          e.status
      FROM
        faculty f
      LEFT JOIN emails e ON
          e.faculty_id = f.faculty_id
      INNER JOIN class c ON
          c.faculty_id = e.faculty_id
      WHERE
          c.school_year = ? AND c.semester = ?
      GROUP BY
          f.lastname,
          f.firstname,
          f.middlename
      ORDER BY
          f.lastname,
          f.firstname,
          f.middlename`
    } else if(accessLevel === 'Dean') {
      query = `SELECT
          e.id,
          CONCAT(
              TRIM(f.lastname),
              ', ',
              TRIM(f.firstname),
              ' ',
              TRIM(f.middlename)
          ) AS facultyName,
          e.email,
          e.college_code,
          e.faculty_id,
          e.status
      FROM
          emails e
      INNER JOIN faculty f ON
          f.faculty_id = e.faculty_id
      INNER JOIN class c ON
          c.faculty_id = e.faculty_id
      WHERE
          c.school_year = ? AND c.semester = ? AND e.college_code = ?
      GROUP BY
          f.lastname,
          f.firstname,
          f.middlename
      ORDER BY
          f.lastname,
          f.firstname,
          f.middlename`
    }
    const conn = await startConnection(req);
    try {
      if(accessLevel === 'Administrator' || accessLevel === 'Registrar') {
        const [rows] = await conn.query(query,[school_year, semester]);
        return rows
      } else if(accessLevel === 'Dean') {
        const [rows] = await conn.query(query,[school_year, semester, college_code]);
        return rows
      } else {
        return []
      }
    } catch (err) {
    } finally {
      await endConnection(conn);
    }
  }
}

module.exports = FacultyService