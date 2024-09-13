const { startConnection, endConnection } = require("../config/conn");

const UserService = {
    createUser: async (req) => {
        let { emailAddress, college_code, program_code, facultyId, accessLevel } = req.body;
        const { email:emailUsed } = req.cookies;
        let response = {};
        const checkAccessLevelForCollegeCode = ['Administrator', 'Registrar'].includes(accessLevel);
        const checkAccessLevelForProgramCode = ['Administrator', 'Registrar', 'Dean'].includes(accessLevel);
        if(emailAddress.split('@')[1] === 'chmsu.edu.ph'){
          const conn = await startConnection(req);
          if(['Administrator', 'Registrar', 'Dean', 'Chairperson'].includes(accessLevel)) {
            const [checkFacultyID] = await conn.query(`SELECT id FROM emails ORDER BY id DESC LIMIT 1`);
            facultyId = `${accessLevel}_${checkFacultyID[0].id+1}`
          }
          if(checkAccessLevelForCollegeCode) {
            college_code=''
          }
          if(checkAccessLevelForProgramCode) {
            program_code=''
          }
          try {
            const [rows] = await conn.query(`SELECT * FROM emails WHERE email = ?`, [emailAddress]);
            if(rows.length < 1) {
              const [rows2] = await conn.query(`INSERT INTO emails(faculty_id, email, college_code, accessLevel, program_code) VALUES(?,?,?,?,?)`, [facultyId, emailAddress, college_code, accessLevel, program_code]);
              await conn.query(`INSERT INTO email_logs(email_used, new_faculty_id, new_email, new_accessLevel, new_status, action_type) VALUES(?,?,?,?,?,?)`, [emailUsed, facultyId, emailAddress, accessLevel, 1, 'create']);
              response = rows2.affectedRows > 0 && {"success": 1, message:"Successfully Created"}
            } else {
              response = {"success": 0, message: "The email you entered is already registered."}
            }
          } catch(err) {
            response = {"success": 0, message: "Unable to Create.", error: err.message}
            console.error(err.message);
          } finally {
            await endConnection(conn);
          }
        } else {
          console.log("Please use a chmsu email address");
          response = {"success": 0, message: "Please use a chmsu email address"};
        }
        return response;
    },
    updateUser: async (req) => {
        const { id, email, college_code, faculty_id, accessLevel, status, dataToCheck, program_code } = req.body;
        const { email:emailUsed } = req.cookies;
        const data = JSON.parse(dataToCheck);
        const oldData = {
          email: data.email, 
          college_code:data.college_code,
          faculty_id:data.faculty_id, 
          accessLevel:data.accessLevel, 
          status:data.status,
          program_code:data.program_code
        }
        const newData = {
          email, college_code, faculty_id, accessLevel, status:parseInt(status), program_code
        }
        const compareTwoObjects = (oldData, newData) => {
          const differences = [];
          for (const key in newData) {
            if (newData.hasOwnProperty(key)) {
                if (newData[key] !== oldData[key]) {
                    differences.push({
                        property: key,
                        oldValue: oldData[key],
                        newValue: newData[key]
                    });
                }
            }
          }
      
          // Check for properties that are in oldObj but not in newObj
          for (const key in oldData) {
              if (oldData.hasOwnProperty(key)) {
                  if (!(key in newData)) {
                      differences.push({
                          property: key,
                          oldValue: oldData[key],
                          newValue: undefined // Property no longer exists in newObj
                      });
                  }
              }
          }
          return differences;
        }
        let newFacultyId;
        const conn = await startConnection(req);
        if(['Administrator', 'Registrar', 'Dean', 'Chairperson'].includes(accessLevel)) {
          const [checkFacultyID] = await conn.query(`SELECT id FROM emails WHERE email = ? ORDER BY id DESC LIMIT 1`,[oldData.email]);
          newFacultyId = `${accessLevel}_${checkFacultyID[0].id}`
        } else {
          newFacultyId = newData.faculty_id;
        }
        const dataComparison = compareTwoObjects(oldData, newData);
        console.log(dataComparison);
        let response = {};
        if(dataComparison.length > 0) {
          const rowEmailLogsParam = [
            emailUsed,
            oldData.faculty_id,
            newFacultyId,
            oldData.email,
            newData.email,
            oldData.accessLevel,
            newData.accessLevel,
            oldData.status,
            newData.status,
            'update'
          ]
          const rowUpdateEmailParam = [
            newFacultyId,
            newData.email,
            newData.college_code,
            newData.accessLevel,
            newData.status,
            newData.program_code,
            id
          ]
          try {
            const [updateEmail] = await conn.query(`UPDATE emails SET faculty_id = ?, email = ?, college_code = ?, accessLevel = ?, status = ?, program_code = ? WHERE id = ?`, rowUpdateEmailParam);
            if(updateEmail.changedRows > 0) {
              const [emailLogs] = await conn.query(`INSERT INTO email_logs(email_used, old_faculty_id, new_faculty_id, old_email, new_email, old_accessLevel, new_accessLevel, old_status, new_status, action_type) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, rowEmailLogsParam);
              response = emailLogs.affectedRows > 0 ? {"success": true, message: "Successfully Updated"} : {"success": false, message: "Failed to Updated"}
            } else {
              response = {"success": 0, message: "Failed to Update", changes: updateEmail.changedRows}
            }
          } catch(err) {
            console.error(err.message);
          } finally {
            await endConnection(conn);
          }
        } else {
          response = {"success": 0, message: "Failed to Update. Please make some changes and try again"}
        }
        return response;
    }
}

module.exports = UserService