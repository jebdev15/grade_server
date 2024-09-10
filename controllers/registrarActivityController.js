const { startConnection, endConnection } = require("../config/conn");
const { RegistrarActivityService } = require("../services/registrarActivityService");
module.exports.RegistrarActivityController = {
    getData: async (conn) => {
        try {
            const rows = await RegistrarActivityService.getData(conn);
            return rows
        } catch(err) {
            console.error(err.message);
        }
    },
    getOneData: async (conn, req) => {
        try {
            const rows = await RegistrarActivityService.getOneData(conn, req);
            return rows
        } catch(err) {
            console.error(err.message);
        }
    },
    updateData: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const rows = await updateRegistrarActivity(conn, req);
        } catch(err) {
            console.error(err.message);
        }
    }
}