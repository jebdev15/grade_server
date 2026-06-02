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
    } finally {
      await endConnection(conn);
    }
})

// response to GradeSubmission Component
router.get('/getFacultyBySchoolYearAndSemester', FacultyController.getFacultyBySchoolYearAndSemester)
router.get('/getEmails', async (req, res) => {
    const { college_code, accessLevel } = req.cookies;
    const identifyAccessLevel = getEmailsAllowedAccessLevels(accessLevel);
    const conn = await startConnection(req);
    try {
      const rows = identifyAccessLevel ? await getEmails(conn) : await getEmailsPerCollegeCode(conn, college_code);
      res.status(200).json(rows)
    } catch(err) {
    } finally {
      await endConnection(conn);
    }
})
// response to Eye Icon under GradeSubmission Component
router.get("/getSubjectLoad", SubjectLoadController.getClassByFacultyIdYearAndSemester);

router.get("/getStudentsByClassCode", StudentController.getStudentsByClassCode);

// response to Users Component
router.get('/getAllEmails', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getAllEmails(conn);
    res.status(200).json(rows)
  } catch(err) {
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
    } finally {
      await endConnection(conn);
    }
})

router.patch('/updateClassStatusByClassCode', SubjectLoadController.updateClassStatusByClassCode);

router.patch('/updateMidtermClassStatusByClassCode', SubjectLoadController.updateMidtermClassStatusByClassCode);
// router.put('/updateClassStatusBySchoolYearAndSemester', SubjectLoadController.updateClassStatusByYearAndSemester);

router.get('/getRegistrarActivity', RegistrarActivityController.getData)
router.get('/getRegistrarActivityBySemester', RegistrarActivityController.getDataBySemester)
router.put('/updateRegistrarActivityById', RegistrarActivityController.updateDataById)

router.put('/updateClassStatusByYearAndSemester', SubjectLoadController.updateClassStatusByYearAndSemester)

router.post('/createUser', UserController.createUser)
router.put('/updateUser', UserController.updateUser)

router.get('/getAccessLevels', async (req, res) => {
  const { accessLevel } = req.cookies;
  const getAccessLevels = ["Faculty", "Part Time", "Registrar", "Administrator", "Chairperson", "Dean"];
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
  } finally {
    await endConnection(conn);
  }
})

router.get('/getClassCodeDetails', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getClassCodeDetails(conn, req);
    res.status(200).json(rows || [])
  } catch(err) {
    res.json({message: err.message});
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
  } finally {
    await endConnection(conn);
  }
})

router.get('/getClassGraduateStudiesStudents', async (req, res) => {
  const { class_code } = req.query;
  const decode = {
    classCode: urlDecode(class_code),
  }
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query(
      `
      SELECT 
        sg.student_id as studentID,
        CONCAT(s.student_lastname , ', ', s.student_firstname, ' ', s.student_middlename) as studentName,
        FORMAT(sg.mid_grade, 2) as midTermGrade, 
        FORMAT(sg.final_grade, 2) as endTermGrade,  
        FORMAT(sg.grade, 2) as finalGrade, 
        sg.remarks
      FROM 
        class c 
      INNER JOIN 
        student_load sl
      USING (class_code) 
      INNER JOIN 
        student s 
      USING (student_id)
      INNER JOIN 
        student_grades sg
      USING (student_id)
      WHERE 
        class_code = '${decode.classCode}'
        AND sg.subject_code = c.subject_code
        AND sg.school_year = c.school_year
        AND sg.semester = c.semester 
      GROUP BY studentName
      ORDER BY studentName`
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json(error.message);
  } finally {
    await endConnection(conn);
  }
});

router.get('/getStudentsInitialData', async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getStudentsInitialData(conn, req);
    res.json(rows || [])
  } catch(err) {
    res.json({message: err.message});
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
    res.status(500).json(err.message);
  } finally {
    await endConnection(conn);
  }
});

router.post("/getStudentsBySearch", async (req, res) => {
  const conn = await startConnection(req);
  try {
    const rows = await getStudentsBySearch(conn, req);
    
    res.json(rows);
  } catch (err) {
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
    res.json(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.get("/getAllEmailsForExtension", async (req, res) => {
  const conn = await startConnection(req);
  try {
    const { school_year, semester } = req.query
      const [rows] = await conn.query(
          `select 
          e.id,
          f.lastname as lastName,
          f.firstname as firstName,
          e.email,
          e.college_code,
          e.faculty_id,
          e.accessLevel,
          e.program_code,
          GROUP_CONCAT(class_code SEPARATOR ', ') as class_codes,
          GROUP_CONCAT(CONCAT(c.subject_code, ' - ',CONCAT(s.program_code,' ',s.yearlevel,' - ',s.section_code)) SEPARATOR ', ') as class_list,
          CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END as status
          from emails as e 
          LEFT JOIN faculty as f 
          USING(faculty_id) 
          INNER JOIN 
          class c ON c.faculty_id = e.faculty_id
          INNER JOIN 
          section s ON s.section_id = c.section_id
          WHERE c.school_year = ? AND semester = ?
          GROUP BY f.lastname, f.firstname, f.middlename
          `,[school_year, semester]
      );
      res.json(rows);
  } catch (err) {
      res.json(err.message);
  } finally {
      await endConnection(conn);
  }
})

const extendUploadingOfGradeByClassCode = async (conn, rowsContainer, email, class_codes, deadline_extend_start, deadline_extend_end, school_year, semester) => {
  try {
    for (const class_code of class_codes.split(",")) {
      const params = [ email, class_code, deadline_extend_start, deadline_extend_end, school_year, semester, "approved" ];
      const [rows] = await conn.query(`INSERT INTO upload_grade_extensions 
        (email, class_code, deadline_extend_start, deadline_extend_end, school_year, semester, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        params);

      if (rows.affectedRows) {
        await conn.query(`UPDATE class_code_status SET midterm_status = 0, endterm_status = 0 WHERE class_code = ?`, [class_code]);
        rowsContainer.push(1);
      }
    }
  } catch (error) {
    return { insertedRows: 0 };
  } 
}

const updateClassCodeStatusByClassCode = async (conn, email, class_codes, term_type) => {
  try {
      const [rows] = await conn.query("UPDATE class_code_status SET ? WHERE class_code IN (?)", [{ [term_type]: 0 }, class_codes.split(",")]);

      if (rows.affectedRows) {
        const { bulkInsertLogsAffectedRows } = await bulkInsertLogs(conn, email, term_type, class_codes.split(","));
        return { insertedRows: bulkInsertLogsAffectedRows };
      }
      return { insertedRows: 0 };
  } catch (error) {
    return { insertedRows: 0 };
  } 
}

const bulkInsertLogs = async (conn, email, term_type, class_codes) => {
  const termType = term_type.split("_")[0];
  if (class_codes.length === 0) return;

  // Create placeholders (?, ?, ?, ?), (?, ?, ?, ?), ...
  const placeholders = class_codes.map(() => "(?, ?, ?, ?)").join(", ");

  // Flatten the values: [email, "Unlocked", term_type, class_code1, email, "Unlocked", term_type, class_code2, ...]
  const values = class_codes.flatMap(class_code => [email, "Unlocked", termType, class_code]);

  // Execute the bulk INSERT query
  const [rows] = await conn.query(
      `INSERT INTO tbl_class_update_logs (email_used, action_type, term_type, class_code) VALUES ${placeholders}`,
      values
  );
  return { bulkInsertLogsAffectedRows: rows.affectedRows };
};

router.post("/extendUploadingOfGradeByClassCode", async (req, res) => {
  const conn = await startConnection(req);
  const { class_codes, deadline_extend_start, deadline_extend_end, schoolyear: school_year, semester } = req.body;
  try {
    const rowsContainer = []
    const { email } = req.cookies;
    await extendUploadingOfGradeByClassCode(conn, rowsContainer, email, class_codes, deadline_extend_start, deadline_extend_end, school_year, semester)
    res.json({message: "Successfully Added"});
  } catch (err) {
    res.json(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.put("/updateClassCodeStatusByClassCode", async (req, res) => {
  const conn = await startConnection(req);
  const { class_codes, term_type } = req.body;
  try {
    const { email } = req.cookies;
    const { insertedRows } = await updateClassCodeStatusByClassCode(conn, email, class_codes, term_type)
    res.json({message: insertedRows > 0 ? "Successfully Updated" : "Failed to Update"});
  } catch (err) {
    res.json(err.message);
  } finally {
    await endConnection(conn);
  }
})

router.post("addGraduateStudiesSubjectCode", async (req, res) => {
  const conn = await startConnection(req);
  try {
    const { subject_code } = req.body;
    const [rows] = await conn.query(`INSERT INTO graduate_studies (subject_code) VALUES (?)`, [subject_code]);
    res.json(rows);
  } catch (err) {
    res.json(err.message);
  } finally {
    await endConnection(conn);
  }
})
module.exports = router;