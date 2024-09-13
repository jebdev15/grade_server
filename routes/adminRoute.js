const express = require("express");
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const { urlDecode } = require('url-encode-base64');
const { 
  getEmails, 
  getSubjectLoad, 
  getAllEmails, 
  getAllNoAccounts,
  getColleges,
  getProgramCodes,
  getSubjectCodes,
  checkNewCollege,
  saveCollege,
  getDeadlineLogs,
  saveSubjectCode,
  getEmailsPerCollegeCode,
  getClassCodeDetails,
  getClassStudents,
  getStudentsInitialData,
  getStudentGrades,
  getStudentYearSemesterAndSchoolYear,
  getStudentsBySearch,
  getProgramCodesByCampus, 
} = require("../services/admin.services");
const { getEmailsAllowedAccessLevels } = require("../utils/admin.utils");
const RegistrarActivityController = require("../controllers/registrarActivityController");
const SubjectLoadController = require("../controllers/subjectLoadController");
const FacultyController = require("../controllers/facultyController");
const StudentController = require("../controllers/studentController");
const UserController = require("../controllers/userController");

// response to Index Component
router.get('/getCurrentSchedule', async (req, res) => {
    const conn = await startConnection(req);
    try {
      const rows = getCurrentSchedule(conn);
      res.status(200).json(rows)
    } catch(err) {
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
})

// response to GradeSubmission Component
router.get('/getFacultyBySchoolYearAndSemester', FacultyController.getFacultyBySchoolYearAndSemester)
router.get('/getEmails', async (req, res) => {
    const { college_code, accessLevel } = req.cookies;
    console.log({college_code, accessLevel});
    const identifyAccessLevel = getEmailsAllowedAccessLevels(accessLevel);
    const conn = await startConnection(req);
    try {
      const rows = identifyAccessLevel ? await getEmails(conn) : await getEmailsPerCollegeCode(conn, college_code);
      res.status(200).json(rows)
    } catch(err) {
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
})
// response to Eye Icon under GradeSubmission Component
router.get("/getSubjectLoad", async (req, res) => {
    const { faculty_id, school_year, semester, class_code } = req.query;
    const decodedParams = Object.values(req.query).map((param) => urlDecode(param))
    const params = class_code ? [decodedParams[0], decodedParams[1], decodedParams[2], decodedParams[3]] : [decodedParams[0], decodedParams[1], decodedParams[2]];
    const sqlParams = class_code ? `AND class_code = ?` : "";
    const conn = await startConnection(req);
    try {
      const rows = await getSubjectLoad(conn, sqlParams, params);
      res.status(200).json(rows);
    } catch (err) {
      console.log(err.message);
      res.status(500).json(err.message);
    } finally {
      await endConnection(conn);
    }
});

router.get("/getStudentsByClassCode", StudentController.getStudentsByClassCode);

// response to Users Component
router.get('/getAllEmails', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getAllEmails(conn);
    res.status(200).json(rows)
  } catch(err) {
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

// response to Reports Component
// response to Grade Sheet Submission Logs Dropdown Report
router.get('/getGradeSubmissionLogs', async (req, res) => {
    const {class_code} = req.query;
    const conn = await startConnection(req);
    try {
      const rows = getGradeSubmissionLogs(conn, class_code);
      res.status(200).json(rows)
    } catch(err) {
      res.status(500).json(err.message);
      console.error(err.message);
    } finally {
      await endConnection(conn);
    }
})

router.patch('/updateClassStatusByClassCode', SubjectLoadController.updateClassStatusByClassCode);
router.put('/updateClassStatusBySchoolYearAndSemester', SubjectLoadController.updateClassStatusByYearAndSemester);

router.get('/getRegistrarActivity', RegistrarActivityController.getData)
router.get('/getRegistrarActivityBySemester', RegistrarActivityController.getDataBySemester)
router.put('/updateRegistrarActivityById', RegistrarActivityController.updateDataById)

router.put('/updateClassStatusByYearAndSemester', SubjectLoadController.updateClassStatusByYearAndSemester)

router.post('/createUser', UserController.createUser)
router.put('/updateUser', UserController.updateUser)

router.get('/getAccessLevels', async (req, res) => {
  const { accessLevel } = req.cookies;
  const getAccessLevels = [
    "Faculty", "Part Time", "Registrar", "Administrator", "Chairperson", "Dean",
  ];
  let data = [];
  if(accessLevel !== 'Administrator') {
    data = getAccessLevels.filter(user => user !== 'Administrator')
  } else {
    data = getAccessLevels
  } 
  res.json(data)
})

router.get('/getAllNoAccounts', async (req, res) => {
  const conn = await startConnection(req);
  try{
    const data = await getAllNoAccounts(conn);
    const rows = data.length > 0 ? data : [];
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


// Settings Route

// Get Colleges
router.get('/getColleges', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getColleges(conn);
    res.status(200).json(rows || [])
  } catch(err) {
    res.status(500).json([])
  } finally {
    await endConnection(conn);
  }
})

// Save College
router.post('/saveCollege', async (req, res) => {
  const { college_code, college_desc } = req.body;
  const conn = await startConnection(req);
  try { 
    const checkIfExists = await checkNewCollege(conn, college_code, college_desc);
    if(checkIfExists.length > 0) { 
      res.status(200).json({message: "College already exist"})
    } else {
      const rows = await saveCollege(conn, college_code, college_desc);
      res.status(200).json({message: "Successfully Saved", rows})
    }
  } catch(err) {
    console.error(err.message);
    res.status(500).json({message: "Unable to Save", error: err.message});
  } finally {
    await endConnection(conn);
  }
})

// Get Program Codes
router.get('/getProgramCodes', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getProgramCodes(conn);
    res.status(200).json(rows || [])
  } catch(err) {
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

// Get Colleges
router.get('/getSubjectCodes', async (req, res) => {
  const { curriculum_id } = req.query;
  const conn = await startConnection(req);
  try {
    const rows = await getSubjectCodes(conn, curriculum_id);
    res.status(200).json(rows || [])
  } catch(err) {
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.post('/saveSubjectCode', async (req, res) => {
  const { subject_code } = req.body;
  const conn = await startConnection(req);
  try {
    const rows = await saveSubjectCode(conn, subject_code);
    res.status(200).json({message: "Successfully Saved", rows})
  } catch(err) {
    console.error(err.message);
    res.status(500).json({message: "Unable to Save", error: err.message});
  } finally {
    await endConnection(conn);
  }
})

router.get('/getDeadlineLogs', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getDeadlineLogs(conn);
    res.status(200).json(rows || [])
  } catch(err) {
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get('/getClassCodeDetails', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getClassCodeDetails(conn, req);
    console.log(rows);
    res.status(200).json(rows || [])
  } catch(err) {
    res.json({message: err.message});
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get('/getClassStudents', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getClassStudents(conn, req);
    res.status(200).json(rows || [])
  } catch(err) {
    res.json({message: err.message});
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get('/getStudentsInitialData', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getStudentsInitialData(conn, req);
    res.json(rows || [])
  } catch(err) {
    res.json({message: err.message});
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get('/getStudentYearSemesterAndSchoolYear', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getStudentYearSemesterAndSchoolYear(conn, req);
    res.json(rows || [])
  } catch(err) {
    res.json({message: err.message});
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get('/getStudentGrades', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getStudentGrades(conn, req);
    res.json(rows || [])
  } catch(err) {
    res.json({message: err.message});
    console.error(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get("/getSubjectCodesGS", async (req, res) => {
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query("SELECT * FROM graduate_studies");
    res.status(200).json(rows);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  } finally {
    await endConnection(conn);
  }
});

router.post("/getStudentsBySearch", async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getStudentsBySearch(conn, req);
    console.log(rows);
    
    res.json(rows);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  } finally {
    await endConnection(conn);
  }
});

router.get("/getProgramCodesByCampus", async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getProgramCodesByCampus(conn);
    res.json(rows);
  } catch (err) {
    console.log(err.message);
    res.json(err.message);
  } finally {
    await endConnection(conn);
  }
})
module.exports = router;