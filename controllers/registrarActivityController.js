const { startConnection, endConnection } = require("../config/conn");
const RegistrarActivityService = require("../services/registrarActivityService");
const RegistrarActivityController = {
    getData: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const rows = await RegistrarActivityService.getData(conn);
            res.status(200).json(rows || [])
        } catch(err) {
            res.status(500).json({message: err});
        } finally {
            await endConnection(conn);
        }
    },
    getDataBySemester: async (req, res) => {
        const conn = await startConnection(req);
        try {
          const rows = await RegistrarActivityService.getDataBySemester(conn, req);
          res.status(200).json(rows[0] || [])
        } catch(err) {
        } finally {
          await endConnection(conn);
        }
      },
      getDataByEncodedSemester: async (req, res) => {
        const conn = await startConnection(req);
        try {
          const rows = await RegistrarActivityService.getDataByEncodedSemester(conn, req);
          res.status(200).json(rows[0] || [])
        } catch(err) {
        } finally {
          await endConnection(conn);
        }
      },
    updateDataById: async (req, res) => {
        const conn = await startConnection(req);
        try {
          const rows = await RegistrarActivityService.updateDataById(conn, req);
          res.status(200).json({message: rows.changedRows > 0 ? "Successfully Updated" : "Unable to Update", hasChanges: Boolean(rows.changedRows)})
        } catch(err) {
        } finally {
          await endConnection(conn);
        }
      }
}

module.exports = RegistrarActivityController