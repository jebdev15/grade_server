const RegistrarActivityService = {
    getData: async (conn) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online`)
        return rows;
    },
    getDataBySemester: async (conn, req) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online WHERE semester = ?`, [req.query.semester])
        return rows;
    },
    updateDataById: async (conn, req) => {
        const { activity, schoolyear, semester, status, from, to, id } = req.body
        const [rows] = await conn.query("UPDATE registrar_activity_online SET activity = ?, schoolyear = ?, semester = ?, status = ?, `from` = ?, `to` = ? WHERE id = ?", [activity, schoolyear, semester, status, from, to, id])
        return rows;
    },
}

module.exports = RegistrarActivityService