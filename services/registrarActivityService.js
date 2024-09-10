module.exports.RegistrarActivityService = {
    getData: async (conn) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online`)
        return rows;
    },
    getOneData: async (conn, req) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online WHERE semester = ?`, [req.query.semester])
        return rows;
    },
}