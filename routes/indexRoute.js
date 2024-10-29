const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const upload = multer({ dest: "./tmp/" });
const router = express.Router();
const { startConnection, endConnection } = require("../config/conn");
const ExcelJS = require("exceljs");
const { urlDecode } = require('url-encode-base64')
const {
  eventkeyUserEmailRef,
  insertModifiedEventLog,
  checkIfHasRemarkInGradeSheet
} = require("../services/eventkey");
const { getSingleSetOfData } = require("../utils/get-data.utils");
const { 
  getLoad,
  getGradeTable,
  getExcelFile,
  getGraduateStudiesTable,
  indexUpdateClassCodeStatus,
  indexUpdateGrade,
  indexUpdateGraduateStudiesGrade,
  indexInsertMidtermClassCodeUpdateLog
} = require("../services/index.services");
const RegistrarActivityController = require("../controllers/registrarActivityController");

router.get('/getClassGraduateStudiesStudents', async (req, res) => {
  const { class_code, semester, currentSchoolYear } = req.query;
  const decode = {
    classCode: urlDecode(class_code),
    semester: urlDecode(semester),
    currentSchoolYear: urlDecode(currentSchoolYear),
  }
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query(
      `
      SELECT 
        sg.student_id as studentID,
        CONCAT(s.student_lastname , ', ', s.student_firstname, ' ', s.student_middlename) as studentName,
        FORMAT(sg.mid_grade,2) as midTermGrade, 
        FORMAT(sg.final_grade,2) as endTermGrade,  
        FORMAT(sg.grade,2) as finalGrade, 
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
      AND 
        sg.subject_code = c.subject_code 
      AND
        sg.school_year = '${decode.currentSchoolYear}' 
      AND 
        sg.semester = '${decode.semester}' 
      GROUP BY studentName
      ORDER BY studentName`
    );
    await endConnection(conn);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

router.get('/getClassStudents', async (req, res) => {
  const { class_code, semester, currentSchoolYear } = req.query;
  const decode = {
    classCode: urlDecode(class_code),
    semester: urlDecode(semester),
    currentSchoolYear: urlDecode(currentSchoolYear),
  }
  const conn = await startConnection(req);
  try {
    const [rows] = await conn.query(
      `
      SELECT 
        sg.student_id as studentID,
        CONCAT(s.student_lastname , ', ', s.student_firstname, ' ', s.student_middlename) as studentName, 
        CASE 
          WHEN sg.mid_grade = 0 THEN '' 
          WHEN sg.mid_grade BETWEEN 1 AND 3 THEN FORMAT(sg.mid_grade,2)
          ELSE FORMAT(sg.mid_grade,0) 
        END as midTermGrade, 
        CASE 
          WHEN sg.final_grade = 0 THEN '' 
          WHEN sg.final_grade BETWEEN 1 AND 3 THEN FORMAT(sg.final_grade,2)
          ELSE FORMAT(sg.final_grade,0) 
        END as endTermGrade, 
        CASE 
          WHEN sg.grade = 0 THEN '' 
          ELSE FORMAT(sg.grade, 0) 
        END as finalGrade, 
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
      AND 
        sg.subject_code = c.subject_code 
      AND
        sg.school_year = '${decode.currentSchoolYear}' 
      AND 
        sg.semester = '${decode.semester}' 
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

router.get('/getClassCodeDetails', async (req, res) => {
  const { semester, currentSchoolYear, class_code } = req.query;
  const decode = {
    semester: urlDecode(semester),
    currentSchoolYear: urlDecode(currentSchoolYear),
    class_code: urlDecode(class_code),
  }
  
      const conn = await startConnection(req);
      try {
        const [rows] = await conn.query(`SELECT  
                                          CONCAT(f.lastname,' ',f.firstname) as instructor,
                                          CONCAT(c.subject_code, ' - ', sub.descriptive_title) as subject,
                                          CONCAT(s.program_code,' ',s.yearlevel,' - ',s.section_code) as section,
                                          (SELECT 
                                            major.major_title
                                          FROM 
                                            student_grades
                                          INNER JOIN 
                                            section 
                                          USING(program_code)
                                          INNER JOIN 
                                            major
                                          USING(major_code)
                                          LIMIT 1) AS major
                                        FROM 
                                          class c 
                                        INNER JOIN 
                                          faculty f 
                                        USING (faculty_id)
                                        INNER JOIN 
                                          section s
                                        USING (section_id)
                                        INNER JOIN
                                          subject sub
                                        USING (subject_code)
                                        WHERE 
                                          c.class_code = ? 
                                        AND 
                                          c.semester = ? 
                                        AND 
                                          c.school_year = ?
                                        LIMIT 1`, 
        [decode.class_code, decode.semester, decode.currentSchoolYear]);
        await endConnection(conn);
        res.status(200).json(rows);
      } catch (err) {
        console.log(err.message);
        res.status(500).json(err.message);
      }
})

router.get('/getRegistrarActivity', RegistrarActivityController.getData);
router.get('/getRegistrarActivityBySemester', RegistrarActivityController.getDataByEncodedSemester);

router.get('/getLastGradeSheetSubmittedLog', async (req, res) => {
  const { class_code } = req.query;
  const conn = await startConnection(req);
  try {
    const rows = await getSingleSetOfData(conn, 'tbl_class_update_logs', 'class_code', class_code);
    const data = rows.length > 0 ? rows.reverse()[0] : '--'
    const statusCode = rows.length > 0 ? 200 : 404
    console.log(data);
    res.status(statusCode).json(data);
  } catch (error) {
    res.status(500).json(error);
  } finally {
   await endConnection(conn); 
  }
})

router.get("/getLoad", async (req, res) => {
  const { faculty_id, school_year, semester, class_code } = req.query;
  const query = class_code ? `AND class_code = ?` : "" 
  const params = class_code ? [urlDecode(faculty_id), urlDecode(school_year), urlDecode(semester), urlDecode(class_code)] : [urlDecode(faculty_id), urlDecode(school_year), urlDecode(semester)]
  const conn = await startConnection(req);
  try {
    const rows = await getLoad(conn, query, params);
    res.status(200).json(rows);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  } finally {
    await endConnection(conn);
  }
});

router.get("/getGradeTable", async (req, res) => {
  const { class_code, semester, currentSchoolYear } = req.query;
    const decode = {
        classCode: urlDecode(class_code),
        semester: urlDecode(semester),
        currentSchoolYear: urlDecode(currentSchoolYear),
    };

    const conn = await startConnection(req);
    try {
        const rows = await getGradeTable(conn, decode);
        res.status(200).json(rows);
    } catch (err) {
        console.log(err.message);
        res.status(500).json(err.message);
    } finally {
        await endConnection(conn);
    }
});

router.get("/getGraduateStudiesLoad", async (req, res) => {
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

router.get("/getGraduateStudiesTable", async (req, res) => {
  const { class_code, semester, currentSchoolYear } = req.query;
  const decode = {
    classCode: urlDecode(class_code),
    semester: urlDecode(semester),
    currentSchoolYear: urlDecode(currentSchoolYear),
  };

  const conn = await startConnection(req);
  try {
    const rows = await getGraduateStudiesTable(conn, decode);
    console.log(rows);
    res.status(200).json(rows);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  } finally {
    await endConnection(conn);
  }
});

router.get("/getExcelFile", async (req, res) => {
  const { class_code, semester, currentSchoolYear, name, classSection } =
    req.query;
  const decode = {
    classCode: urlDecode(class_code),
    semester: urlDecode(semester),
    currentSchoolYear: urlDecode(currentSchoolYear),
  }
  const conn = await startConnection(req);
  const data = await getExcelFile(conn, decode)
  await endConnection(conn);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CHMSU Grading System";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet(decode.classCode, {
    pageSetup: {
      fitToPage: true,
      orientation: "portrait",
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0,
        footer: 0,
      },
    },
  });
  

  //HEADER
  sheet.mergeCells("A1", "H1");
  const republic = sheet.getCell("A1");
  republic.value = "Republic of the Philippines";
  republic.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  sheet.mergeCells("A2", "H2");
  const nameofSchool = sheet.getCell("A2");
  nameofSchool.value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
  nameofSchool.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  nameofSchool.font = {
    size: 12,
    bold: true,
  };

  let semesterWord = "";
  switch (decode.semester) {
    case "1st":
      semesterWord = "1st Semester";
      break;
    case "2nd":
      semesterWord = "2nd Semester";
      break;
    case "summer":
      semesterWord = "Summer";
      break;
    default:
      break;
  }
  sheet.mergeCells("A3", "H3");
  const campusInfo = sheet.getCell("A3");
  campusInfo.value = "Main Campus, Talisay City, Negros Occidental";
  campusInfo.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  const logoPic = workbook.addImage({
    filename: `${__dirname}/../public/images/logo.png`,
    extension: "png",
  });
  sheet.addImage(logoPic, {
    tl: {
      col: 1,
      row: 1,
    },
    ext: {
      width: 100,
      height: 100,
    },
  });
  sheet.mergeCells("A5", "H5");
  const officeOfReg = sheet.getCell("A5");
  officeOfReg.value = "Office of the Registrar";
  officeOfReg.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  officeOfReg.font = {
    size: 12,
    bold: true,
  };
  sheet.mergeCells("A6", "H6");
  const gradeSheetTitle = sheet.getCell("A6");
  gradeSheetTitle.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  gradeSheetTitle.value = "Student Grade Sheet";
  sheet.mergeCells("A7", "H7");
  const classInfo = sheet.getCell("A7");
  classInfo.value = `${semesterWord}, A.Y. ${decode.currentSchoolYear} - ${
    parseInt(decode.currentSchoolYear) + 1
  }`;
  classInfo.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  const subject = sheet.getCell("A9")
  subject.value = `SUBJECT: ${data[0].subject_code}`;
  subject.font = {
    bold: true,
    size: 13,
  };

  // const subjectCode = sheet.getCell("B9");
  // subjectCode.value = data[0].subject_code;
  // subjectCode.font = {
  //   bold: true,
  //   size: 13,
  // };
  
  const instructor = sheet.getCell("A10");
  instructor.value = `INSTRUCTOR: ${name}`;
  instructor.font = {
    bold: true,
    size: 13,
  };

  // const section = sheet.getCell("D10");
  // section.value = 'Section:';
  // section.font = {
  //   bold: true,
  //   size: 13,
  // };

  const sectionCode = sheet.getCell("E10");
  sectionCode.value = `CURR/ YR/ SEC: ${decodeURI(classSection)}`;
  sectionCode.font = {
    bold: true,
    size: 13,
  };
  sheet.getRow(13).values = [
    "Grade ID",
    "Student ID",
    "Name",
    "Midterm",
    "Endterm",
    "Average",
    "Status",
    "Remark",
  ];
  sheet.getRow(13).font = {
    bold: true,
  };
  sheet.columns = [
    { key: "student_grades_id", width: 10 },
    { key: "student_id", width: 10 },
    { key: "name", width: 50 },
    { key: "mid_grade", width: 10 },
    { key: "final_grade", width: 10 },
    { key: "grade", width: 10 },
    { key: "status", width: 12 },
    { key: "remarks", width: 12 },
  ];

  data.forEach((item, i) => {
    const {
      student_grades_id,
      student_id,
      name,
      mid_grade,
      final_grade,
      remarks,
    } = item;
    const currentRow = i + 14;
    const row = sheet.getRow(currentRow);
    row.font = {
      size: 13,
    };

    let remark = null;
    let status = null;
    switch (remarks) {
      case "passed":
        status = "Passed";
        break;
      case "failed":
        status = "Failed";
        break;
      case "inc":
        remark = "Incomplete";
        break;
      case "drp":
        remark = "Dropped";
        break;
      case "ng":
        remark = "No Grade";
        break;
      case "na":
        remark = "No Attendance";
        break;
      case "w":
        remark = "Withdrawn";
        break;
      default:
        break;
    }
    row.values = {
      student_grades_id,
      student_id,
      name,
      mid_grade,
      final_grade,
      status,
      remarks: remark,
    };
    const ave = ((parseInt(item.mid_grade) + parseInt(item.final_grade)) / 2);
    const average = (ave >= 1 && ave <= 5) ? ave : Math.round(ave);
    sheet.getCell(`F${currentRow}`).value = {
      formula: `IF(COUNTIF(D${currentRow}:E${currentRow}, "<>0") > 1, ROUND(AVERAGE(D${currentRow}:E${currentRow}), 0), "")`,
      result: average,
    };

    sheet.getCell(`G${currentRow}`).value = {
      formula: `IF(COUNTIF(D${currentRow}:E${currentRow}, "<>0") > 1, IF(ROUND(AVERAGE(D${currentRow}:E${currentRow}),0) >= 75, "Passed", "Failed"), "")`,
      result: status,
      locked: true,
    };
    sheet.getCell(`H${currentRow}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Incomplete, Dropped, No Attendance, No Grade,  Withdrawn"'],
      locked: true,
    };
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=" + "File.xlsx");
  workbook.xlsx.write(res).then(() => res.end());
});

router.post("/updateGraduateStudiesGrade", async (req, res) => {
  const conn = await startConnection(req);
  const ipAddress = req.ip;
  const { grades, class_code, method, email_used } = req.body;
  // Get User Full Name using Email as Preference
  const userName = await eventkeyUserEmailRef(conn, email_used);
  const modifiedEventKey = await insertModifiedEventLog(conn, "modified_eventlog", "student_grades", userName, "Registrar", ipAddress);
  const countAffectedRows = async (gradeData) => {
    try {
      const rows = await indexUpdateGraduateStudiesGrade(conn, gradeData, modifiedEventKey)
      return rows.affectedRows;
    } catch (err) {
      console.error(err.message);
    }
  };

  const decodeClassCode = urlDecode(class_code);
  try {
    const affectedRowsArr = await Promise.all(
      grades.map(async (grade) => await countAffectedRows(grade))
    );

    const totalAffectedRows = affectedRowsArr.reduce(
      (prev, current) => prev + current,
      0
    );
    await conn.query("INSERT INTO updates (class_code, method) VALUES(?, ?)", [
      decodeClassCode,
      method,
    ]);
    res.status(200).json(totalAffectedRows);
  } catch (error) {
    if (error) console.log(error);
    res.status(500).json(error.message);
  } finally {
    await endConnection(conn);
  }
});

router.post("/updateGrade", async (req, res) => {
  const conn = await startConnection(req);
  const ipAddress = req.ip;
  const { grades, class_code, method, email_used } = req.body;

  // Get User Full Name using Email as Preference
  const userName = await eventkeyUserEmailRef(conn, email_used);
  const modifiedEventKey = await insertModifiedEventLog(conn, "modified_eventlog", "student_grades", userName, "Registrar", ipAddress);
  const countAffectedRows = async (grade) => {
    // let { sg_id, mid_grade, final_grade, dbRemark, status } = grade;
    
    // const average = Math.round((parseInt(mid_grade) + parseInt(final_grade)) / 2);
    
    try {
      const rows = await indexUpdateGrade(conn, grade, modifiedEventKey);
      
      return rows.affectedRows;
    } catch (err) {
      console.error(err.message);
    }
  };

  const decodeClassCode = urlDecode(class_code);
  try {
    const affectedRowsArr = await Promise.all(
      grades.map(async (grade) => await countAffectedRows(grade))
    );

    const totalAffectedRows = affectedRowsArr.reduce(
      (prev, current) => prev + current,
      0
    );
    await conn.query("INSERT INTO updates (class_code, method) VALUES(?, ?)", [
      decodeClassCode,
      method,
    ]);
    await endConnection(conn);
    res.status(200).json(totalAffectedRows);
  } catch (error) {
    if (error) console.log(error);
    res.status(500).json(error.message);
  }
});

router.post(
  "/uploadGradeSheet",
  upload.single("uploadFile"),
  async (req, res) => {
    const uploadFile = req.file;
    const { class_code, method, email_used } = req.body;
    const decodeClassCode = urlDecode(class_code);
  
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadFile.path);

    const sheet = workbook.worksheets[0];
    const sheetName = sheet.name
    const updateDataContainer = [];

    let updatedData = (name, hasUpdated) => {
        updateDataContainer.push({name, hasUpdated})
    }

    let noUpdateData = (name, noUpdate) => {
      updateDataContainer.push({name, noUpdate})
    }

    if(sheetName === decodeClassCode) {
      const extractRowData = (row) => {
        return [
          row.values[1],
          row.values[4],
          row.values[5],
          row.getCell(6).result,
          row.getCell(7).result,
          row.values[8],
          row.values[3],
        ];
      };
      
      const conn = await startConnection(req);
      const userName = await eventkeyUserEmailRef(conn, email_used);
      const modifiedEventKey = await insertModifiedEventLog(conn, "modified_eventlog", "student_grades", userName, "Registrar", req.ip);
      const [rows, fields] = await conn.query(
        "SELECT subject_code FROM class WHERE class_code = ?",
        [decodeClassCode]
      );
      const subjectCode = rows[0].subject_code;
      const processRow = async (rowData, finalRemark) => {
        try {
           const rows = await checkIfHasRemarkInGradeSheet(conn, rowData, subjectCode, finalRemark, modifiedEventKey);
          
          rows.changedRows 
          ? updatedData(rowData[6], 1)
          : noUpdateData(rowData[6], 1)
          await conn.execute(
            "INSERT INTO grade_logs (student_grades_id, status) VALUES(?, ?)",
            [rowData[0], "NP"]
          );
          return rows.changedRows;
        } catch (err) {
          if (err) {
            console.error(err.message);
          }
        }
      }
  
      sheet.eachRow({ includeEmpty: true }, async (row, rowNumber) => {
        if (rowNumber > 13) {
          const rowData = extractRowData(row);
          let finalRemark = "";
          if (rowData[4]) finalRemark = rowData[4].toLowerCase();
          else {
            switch (rowData[5]) {
              case "Incomplete":
                finalRemark = "inc";
                break;
              case "Dropped":
                finalRemark = "drp";
                break;
              case "No Attendance":
                finalRemark = "na";
                break;
              case "Withdrawn":
                finalRemark = "w";
                break;
              default:
                break;
            }
          }
          try {
            await processRow(rowData, finalRemark);
          } catch (error) {
            res.status(500).send(error.message);
          }
        }
        // if (rowNumber > 5) {
        //   const rowData = extractRowData(row);
        //   let finalRemark = "";
        //   if (rowData[4]) finalRemark = rowData[4].toLowerCase();
        //   else {
        //     switch (rowData[5]) {
        //       case "Incomplete":
        //         finalRemark = "inc";
        //         break;
        //       case "Dropped":
        //         finalRemark = "drp";
        //         break;
        //       case "No Attendance":
        //         finalRemark = "na";
        //         break;
        //       case "Withdrawn":
        //         finalRemark = "w";
        //         break;
        //       default:
        //         break;
        //     }
        //   }
        //   try {
        //     await processRow(rowData, finalRemark);
        //   } catch (error) {
        //     res.status(500).send(error.message);
        //   }
        // }
      });
  
      await conn.query("INSERT INTO updates(class_code, method) VALUES(?, ?)", [
        decodeClassCode,
        method,
      ]);
      await endConnection(conn);
      await fs.unlink(uploadFile.path);
      res.status(200).json({isOkay: 1, isError: 0, updateDataContainer: updateDataContainer});
    } else {
      res.status(200).json({isOkay: 1, isError: 1, updateDataContainer: {}});
    }
  }
);

router.post('/submitGradeSheet', async (req, res) => {
  const {class_code, status, email_used} = req.body;
  const classCodeDecode = urlDecode(class_code);

  let response = {};
  const conn = await startConnection(req);
  try {
      response = await indexUpdateClassCodeStatus(conn, email_used, classCodeDecode);
  } catch(err) {
      response = {"success": false ,"message": "Failed to Update", "error": err.message}
      console.error(err.message);
  } finally {
    await endConnection(conn);
  }
  res.json(response)
})

router.post('/submitMidtermGradeSheet', async (req, res) => {
  const {class_code, email_used} = req.body;
  const classCodeDecode = urlDecode(class_code);
  let response = {};
  const conn = await startConnection(req);
  try {
      response = await indexInsertMidtermClassCodeUpdateLog(conn, email_used, classCodeDecode);
  } catch(err) {
      response = {"success": false ,"message": "Failed to Update", "error": err.message}
      console.error(err.message);
  } finally {
    await endConnection(conn);
  }
  res.json(response)
})

module.exports = router;
