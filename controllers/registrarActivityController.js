const { startConnection, endConnection } = require("../config/conn");
const { RegistrarActivityService } = require("../services/registrarActivityService");
module.exports.RegistrarActivityController = {
    getData: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const rows = await RegistrarActivityService.getData(conn);
            res.status(200).json(rows || [])
        } catch(err) {
            console.error(err.message);
        } finally {
            await endConnection(conn);
        }
    },
    updateData: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const rows = await updateRegistrarActivity(conn, req);
            res.status(200).json(rows || [])
        } catch(err) {
            console.error(err.message);
        } finally {
            await endConnection(conn);
        }
    }
}