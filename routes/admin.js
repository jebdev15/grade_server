const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const upload = multer({ dest: "./tmp/" });
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const ExcelJS = require("exceljs");
const { urlDecode } = require('url-encode-base64')

router.get('/getCurrentSchedule', async (req, res) => {
    const conn = await startConnection(req);
    try {
      const [rows] = await conn.query(`select * from registrar_activity`);
      res.json(rows)
      await endConnection(conn);
    } catch(err) {
      console.error(err.message);
    }
})

router.get('/getEmails', async (req, res) => {
    const conn = await startConnection(req);
    try {
      const [rows] = await conn.query(
        `select 
        e.id,
        f.lastname as lastName,
        f.firstname as firstName,
        e.email,
        e.faculty_id,
        e.accessLevel,
        CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END as status
        from emails as e 
        INNER JOIN faculty as f 
        USING(faculty_id) 
        GROUP BY e.id
        ORDER BY e.id ASC
        `
      );
      res.json(rows)
      await endConnection(conn);
    } catch(err) {
      console.error(err.message);
    }
})

router.get('/getAllEmails', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query(
      `select 
      e.id,
      f.lastname as lastName,
      f.firstname as firstName,
      e.email,
      e.faculty_id,
      e.accessLevel,
      CASE WHEN e.status = 1 THEN 'Active' ELSE 'Deactivated' END as status
      from emails as e 
      LEFT JOIN faculty as f 
      USING(faculty_id) 
      GROUP BY e.id
      ORDER BY e.id ASC
      `
    );
    res.json(rows)
    await endConnection(conn);
  } catch(err) {
    console.error(err.message);
  }
})

router.get("/getSubjectLoad", async (req, res) => {
    const { faculty_id, school_year, semester, class_code } = req.query;
    // const decodedURL = {
    //   faculty_id: urlDecode(faculty_id),
    //   school_year: urlDecode(school_year),
    //   semester: urlDecode(semester),
    //   class_code: urlDecode(class_code),
    // }
    const decodedParams = Object.values(req.query).map((param) => urlDecode(param))
    const params = class_code ? [decodedParams[0], decodedParams[1], decodedParams[2], decodedParams[3]] : [decodedParams[0], decodedParams[1], decodedParams[2]];
    const sqlParams = class_code ? `AND class_code = ?` : "";
    const conn = await startConnection(req);
    try {
      const [rows] = await conn.query(
        `SELECT c.class_code as id, 
              c.subject_code,
              CONCAT(s.program_code, ' ', s.yearlevel, ' - ', s.section_code) as section,
              COUNT(DISTINCT student_id) as noStudents,
              c.status
      FROM class c
      INNER JOIN section s USING (section_id)
      INNER JOIN student_load sl USING (class_code)
      WHERE c.faculty_id = ? AND c.school_year = ? AND c.semester = ?
       ${sqlParams} GROUP BY c.class_code ORDER BY section`,
       params
      );
      await endConnection(conn);
      res.status(200).json(rows);
    } catch (err) {
      console.log(err.message);
      res.status(500).json(err.message);
    }
});


router.get('/getGradeSubmissionLogs', async (req, res) => {
    const {class_code} = req.query;
    const conn = await startConnection(req);
    try {
      const [rows] = await conn.query(
        `select
          u.id,
          u.timestamp,
          u.method
          from class c
          inner join updates u
          using(class_code)
          where class_code = ?
        `,
        [urlDecode(class_code)]
      );
      res.status(200).json(rows)
      await endConnection(conn);
    } catch(err) {
      res.status(500).json(err.message);
      console.error(err.message);
    }
})


router.post('/updateClassCodeStatus', async (req, res) => {
    const {class_code, status, email_used} = req.body;
    const classCodeDecode = urlDecode(class_code);
    const newStatus = status == '1' ? 0 : 1;

    let response = {};
    const conn = await startConnection(req);
    try {
        const [rows] = await conn.query(
          `UPDATE class SET status = ? WHERE class_code = ?`,
          [newStatus, classCodeDecode]
        );

        if(rows.changedRows > 0) {
          const [logClassStatus] = await conn.query(`INSERT INTO tbl_class_update_logs(email_used, action_type, class_code) VALUES(?, ?, ?)`, [email_used, newStatus ? 'Locked' : 'Unlocked', classCodeDecode ]);
          response = logClassStatus.affectedRows > 0 ? {"success": true ,"message": "Successfully Updated Status"} : {"success": false ,"message": "Failed to Update"}
        } else {
          response = {"success": false ,"message": "Status Updated"}
        }
    } catch(err) {
        response = {"success": false ,"message": err.message}
        console.error(err.message);
    } finally {
      await endConnection(conn);
    }
    res.json(response)
})

router.post('/updateClassStatus', async (req, res) => {
  const { action, email_used } = req.body;
  let response = {};
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query(`SELECT * FROM registrar_activity`);
    const [statusUpdate] = await conn.query('UPDATE class SET status=? WHERE school_year=? AND semester=?',[action === 'Lock' ? 1 : 0, rows[0].schoolyear, rows[0].semester]);
    if(statusUpdate.changedRows > 0) {
      const [logClassStatus] = await conn.query(`INSERT INTO tbl_class_update_logs(email_used, action_type, class_code) VALUES(?, ?, ?)`, [email_used, action === 'Lock' ? 'Locked' : 'Unlocked', 'all']);
      response = logClassStatus.affectedRows > 0 
                  ? {"success": true, "message": "Successfully Updated", 'statusToAssign': 0} 
                  : {"success": false, "message": "Successfully Updated", 'statusToAssign': 0, "logClassStatus": false}
    } else {
      response = {"success": false, "message": "Successfully Updated", 'statusToAssign': 0, "updateStatus": "No changes"}
    }
  } catch(err) {
    response = {"success": false ,"message": err.message}
  } finally {
    await endConnection(conn);
  }
  res.json(response)
})

router.post('/updateSchedule', async (req, res) => {
    let {email_used, activity, schoolyear, semester, status, from, to} = req.body;
    let response = {};
    const conn = await startConnection(req);
    try {
        const [rows] = await conn.query(
            `SELECT * FROM registrar_activity`
        );
        if(rows.length > 0){
          const [rows2] = await conn.query('UPDATE registrar_activity SET activity = ?, schoolyear = ?, semester = ?, status = ?, `from` = ?, `to` = ?',
          [activity, schoolyear, semester, status, from ,to]
          );
          if(rows2.changedRows > 0) {
            const [deadlineLogs] = await conn.query("INSERT INTO deadline_log(email_used, activity, schoolyear, semester, status, `from`, `to`) VALUES(?, ?, ?, ?, ?, ?, ?)", [email_used, activity, schoolyear, semester, status, from, to]);
            response = deadlineLogs.affectedRows > 0 ? {"success": true, "message": "Successfully Updated"} : {"success": false, "message": "Successfully Updated"}
          } else {
            response = {hasChanges: false, "message": "Successfully Update"}
          }
        } else {
          await conn.query(
              'INSERT INTO registrar_activity VALUES(?, ?, ?, ?, ?, ?)',
              [activity, schoolyear, semester, status, from ,to]
          );
          response = {"updated": false, "message": "Successfully Updated"}
        } 
    } catch(err) {
        response = {"error": true, "message": err.message}
        console.error(err.message);
    } finally {
      await endConnection(conn);
    }
    console.log(response);
    res.json(response)
})


router.post('/createUser', async (req, res) => {
  let { emailAddress, facultyId, accessLevel, emailUsed } = req.body;
  let response = {};
  if(emailAddress.split('@')[1] === 'chmsu.edu.ph'){
    facultyId = accessLevel === 'Registrar' ? accessLevel : facultyId;
    const conn = await startConnection(req);
    try {
      const [rows] = await conn.query(`SELECT * FROM emails WHERE email = ?`, [emailAddress]);
      if(rows.length < 1) {
        const [rows2] = await conn.query(`INSERT INTO emails(faculty_id, email, accessLevel) VALUES(?,?,?)`, [facultyId, emailAddress, accessLevel]);
        await conn.query(`INSERT INTO email_logs(email_used, new_faculty_id, new_email, new_accessLevel, new_status, action_type) VALUES(?,?,?,?,?,?)`, [emailUsed, facultyId, emailAddress, accessLevel, 1, 'create']);
        response = rows2.affectedRows > 0 && {"success": 1, message:"Successfully Created"}
      } else {
        response = {"success": 0, message: "Email has been used"}
      }
    } catch(err) {
      response = {"success": 0, message: "Unable to Create."}
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
  } else {
    console.log("Please use a chmsu email address");
    response = {"success": 0, message: "Please use a chmsu email address"};
  }
  res.json(response)
})

router.post('/updateAccount', async (req, res) => {
  const { id, email, faculty_id, accessLevel, status, emailUsed, dataToCheck } = req.body;
  const data = JSON.parse(dataToCheck);
  const oldData = {
    email: data.email, 
    faculty_id:data.faculty_id, 
    accessLevel:data.accessLevel, 
    status:data.status
  }
  const newData = {
    email, faculty_id, accessLevel, status:parseInt(status)
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
  const dataComparison = compareTwoObjects(oldData, newData);
  console.log(dataComparison);
  let response = {};
  if(dataComparison.length > 0) {
    const rowEmailLogsParam = [
      emailUsed,
      oldData.faculty_id,
      newData.accessLevel !== 'Registrar' ? newData.faculty_id : "Registrar",
      oldData.email,
      newData.email,
      oldData.accessLevel,
      newData.accessLevel,
      oldData.status,
      newData.status,
      'update'
    ]
    const rowUpdateEmailParam = [
      newData.accessLevel !== 'Registrar' ? newData.faculty_id : "Registrar",
      newData.email,
      newData.accessLevel,
      newData.status,
      id
    ]
    const conn = await startConnection(req);
    try {
      const [updateEmail] = await conn.query(`UPDATE emails SET faculty_id = ?, email = ?, accessLevel = ?, status = ? WHERE id = ?`, rowUpdateEmailParam);
      if(updateEmail.changedRows > 0) {
        const [emailLogs] = await conn.query(`INSERT INTO email_logs(email_used, old_faculty_id, new_faculty_id, old_email, new_email, old_accessLevel, new_accessLevel, old_status, new_status, action_type) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, rowEmailLogsParam);
        response = emailLogs.affectedRows > 0 ? {"success": true, message: "Successfully Updated"} : {"success": false, message: "Failed to Updated"}
      }
    } catch(err) {
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
  } else {
    response = {"success": 0, message: "Failed to Update. Please make some changes and try again"}
  }
  res.json(response)
})
router.get('/getAccessLevels', async (req, res) => {
  const getAccessLevels = [
    "Faculty", "Part Time", "Registrar"
  ];
  res.json(getAccessLevels)
})

router.get('/getAllNoAccounts', async (req, res) => {
  const conn = await startConnection(req);
  try{
    let [rows] = await conn.query(`SELECT * FROM faculty WHERE faculty_id NOT IN(SELECT faculty_id FROM emails) AND faculty.status<>? ORDER BY faculty.lastname`,['deleted'])
    rows = rows.length > 0 ? rows : [];
    res.json({"success": 1, "message": "OK", rows})
  }catch(err){
    res.json({"success": 0, "message": err.message, "rows": []})
  } finally{
    await endConnection(conn);
  }
})

router.post('/getAccountDetails', async (req, res) => {
  const { id } = req.body;
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query(`SELECT * FROM emails WHERE faculty_id = ?`, [id]);
    res.json(rows[0])
  } catch(err) {
    res.json({"message": err.message})
  } finally {
    await endConnection(conn);
  }
})

router.post('/setDeadlineLogs', async (req, res) => {
  const { email_used, activity, schoolyear, sem, from, to } = req.body;
  const conn = await startConnection(req);
  let response = {};
  try {
    const [rows] = await conn.query(`INSERT INTO tbl_deadline_logs(email_used, activity, schoolyear, sem, from_date, to_date) VALUES(?, ?, ?, ?, ?, ?)`, [email_used, activity, schoolyear, sem, from, to]);
    response = rows.affectedRows > 0 ? {"message": "Successfully Updated"} : {"message": "Successfully Update"}
  } catch(err) {
    response = {"message": "", "error": err.message}
  } finally {
    await endConnection(conn);
  }
  res.json(response)
})

module.exports = router;