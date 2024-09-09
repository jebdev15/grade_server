module.exports.RegistrarActivityService = {
    getData: async (conn) => {
        let {activity, schoolyear, semester, status, from, to} = req.body;
        const { email:email_used } = req.cookies;
    },
    updateData: async (conn) => {
        let { activity, schoolyear, semester, status, from, to } = req.body;
        const { email:email_used } = req.cookies;
    },
    getRegistrarActivityOnline: async (conn) => {
        const [rows] = await conn.query(`SELECT * FROM registrar_activity_online`)   
    }
}