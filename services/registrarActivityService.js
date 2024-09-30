const { urlDecode } = require("url-encode-base64");

const RegistrarActivityService = {
    getData: async (conn) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online ORDER BY id`)
        return rows;
    },
    getDataBySemester: async (conn, req) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online WHERE semester = ?`, [req.query.semester])
        return rows;
    },
    getDataByEncodedSemester: async (conn, req) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online WHERE semester = ?`, [urlDecode(req.query.semester)])
        return rows;
    },
    updateDataById: async (conn, req) => {
        const { activity, schoolyear, semester, status, from, to, id, currentSem } = req.body
        const [rows] = await conn.query("UPDATE registrar_activity_online SET activity = ?, schoolyear = ?, semester = ?, status = ?, `from` = ?, `to` = ?, currentSem = ? WHERE id = ?", [activity, schoolyear, semester, status, from, to, currentSem, id])
        return rows;
    },
}

module.exports = RegistrarActivityService