const { urlDecode } = require("url-encode-base64");
const { startConnection, endConnection } = require("../config/conn");
const { updateClassCodeStatus, insertClassCodeUpdateLog, getSubjectLoad } = require("./admin.services");

const SubjectLoadService = {
    getSubjectLoadByFacultyIdYearAndSemester: async (req) => {
      const { faculty_id, school_year, semester, class_code } = req.query;
      const decodedParams = Object.values(req.query).map((param) => urlDecode(param))
      const params = class_code ? [decodedParams[0], decodedParams[1], decodedParams[2], decodedParams[3]] : [decodedParams[0], decodedParams[1], decodedParams[2]];
      const sqlParams = class_code ? `AND class_code = ?` : "";
      const conn = await startConnection(req);
      try {
        const rows = await getSubjectLoad(conn, sqlParams, params);
        return rows
      } catch (err) {
        console.log(err.message);
      } finally {
        await endConnection(conn);
      }
    },
    updateClassStatusByClassCode: async (req) => {
        const {class_code, status} = req.body;
        const { email: email_used } = req.cookies;
        const classCodeDecode = urlDecode(class_code);
        const newStatus = status == '1' ? 0 : 1;
        const conn = await startConnection(req);
        try {
            let response = {};
            const rows = await updateClassCodeStatus(conn, newStatus, classCodeDecode);
            console.log(rows);
            if(rows.changedRows > 0) {
              const logClassStatus = await insertClassCodeUpdateLog(conn, email_used, newStatus, classCodeDecode);
              response = logClassStatus.affectedRows > 0 ? {"success": true ,"message": "Successfully Updated Status", newStatus} : {"success": false ,"message": "Failed to Update", newStatus: status}
            } else {
              response = {"success": false ,"message": "Status Updated", newStatus: status}
            }
            return response;
        } catch(err) {
            console.error(err.message);
            return {"success": false ,"message": "Failed to Update", "error": err.message, newStatus: status};
        } finally {
          await endConnection(conn);
        }
    },
    updateClassStatusByYearAndSemester: async (req, res) => {
      const { action, schoolyear, semester } = req.body;
      const {email:email_used} = req.cookies;
      let response;
      const conn = await startConnection(req);
      try {
        const [statusUpdate] = await conn.query('UPDATE class SET status=? WHERE school_year=? AND semester=?',[action === 'Lock' ? 1 : 0, schoolyear, semester]);
        if(statusUpdate.changedRows > 0) {
          const [logClassStatus] = await conn.query(`INSERT INTO tbl_class_update_logs(email_used, action_type, class_code) VALUES(?, ?, ?)`, [email_used, action === 'Lock' ? 'Locked' : 'Unlocked', 'all']);
          response = logClassStatus.affectedRows > 0 
                      ? {"success": true, "message": "Successfully Updated", 'statusToAssign': 0} 
                      : {"success": false, "message": "Successfully Updated", 'statusToAssign': 0, "logClassStatus": false}
        } else {
          response = {"success": false, "message": "Failed to Update. No Changes", 'statusToAssign': 0, "updateStatus": "No changes"}
        }
        res.status(200).json(response)
      } catch(err) {
        response = {"success": false ,"message": err.message}
        res.status(500).json(response)
      } finally {
        await endConnection(conn);
      }
    }
}

module.exports = SubjectLoadService